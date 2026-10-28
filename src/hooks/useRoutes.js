import { useCallback, useEffect, useRef, useState } from 'react';
import { getBuses } from '../services/vigobus';
import { withFreshBuses } from '../services/vigobusAdapter';

const STORAGE_KEY = 'vbus:routes';
// Fase 2: los tiempos de todas las tarjetas se piden de nuevo cada 30 s.
const REFRESH_MS = 30_000;

// Una tarjeta guardada es válida si tiene lo mínimo para pintarse; así un dato
// viejo o manipulado no rompe el render.
function isValidRoute(route) {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.title === 'string' &&
    Array.isArray(route.lines) &&
    Array.isArray(route.buses)
  );
}

// Tarjetas guardadas antes de existir `alias`: su nombre propio era el título
// cuando no coincidía con el de la parada.
function withAlias(route) {
  if (typeof route.alias === 'string') return route;
  return { ...route, alias: route.stopName && route.title !== route.stopName ? route.title : '' };
}

// Lectura inicial (síncrona, antes del primer render): si no hay nada o el
// JSON está corrupto, se empieza con `[]`.
function loadRoutes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isValidRoute).map(withAlias) : [];
  } catch {
    return [];
  }
}

/**
 * Tarjetas del usuario, guardadas en LocalStorage con toda su personalización
 * (nombre, color, autobuses visibles, líneas y su orden de prioridad).
 * Empiezan vacías la primera vez.
 *
 * Refresco automático (Fase 2): al abrir la app, cada 30 s y al volver a la
 * pestaña se piden de nuevo los autobuses de cada parada. Si una parada falla,
 * esa tarjeta conserva sus últimos tiempos (sin romper las demás). Con la
 * pestaña oculta no se pide nada. `refresh()` también se expone para el
 * "tirar para actualizar" del Dashboard (devuelve una promesa).
 */
export function useRoutes() {
  const [routes, setRoutes] = useState(loadRoutes);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): duran solo esta sesión.
    }
  }, [routes]);

  // Siempre la lista actual, sin reiniciar el intervalo cada vez que cambia.
  const routesRef = useRef(routes);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  // Se cancela al desmontar: ninguna respuesta tardía toca el estado.
  const abortRef = useRef(new AbortController());

  const refresh = useCallback(async () => {
    const { signal } = abortRef.current;
    const stopIds = [...new Set(routesRef.current.map((route) => route.stopId).filter(Boolean))];
    if (!stopIds.length) return;
    const results = await Promise.allSettled(stopIds.map((stopId) => getBuses(stopId, { all: true, signal })));
    if (signal.aborted) return;
    const fresh = new Map(
      stopIds.flatMap((stopId, i) => (results[i].status === 'fulfilled' ? [[stopId, results[i].value]] : [])),
    );
    if (!fresh.size) return;
    // Actualización funcional: respeta tarjetas creadas o borradas mientras tanto.
    setRoutes((current) =>
      current.map((route) => (fresh.has(route.stopId) ? withFreshBuses(route, fresh.get(route.stopId)) : route)),
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const refreshIfVisible = () => {
      if (!document.hidden) refresh();
    };

    refreshIfVisible();
    const interval = setInterval(refreshIfVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      controller.abort();
    };
  }, [refresh]);

  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  // Alias de una tarjeta (vacío = sin alias: vuelve el nombre de la parada).
  const renameRoute = useCallback(
    (id, alias) =>
      setRoutes((current) =>
        current.map((route) => {
          if (route.id !== id) return route;
          const clean = alias.trim();
          return { ...route, alias: clean, title: clean || route.stopName || route.title };
        }),
      ),
    [],
  );
  // Nuevo orden tras arrastrar en modo edición (se guarda con el efecto de arriba).
  const reorderRoutes = useCallback((ordered) => setRoutes(ordered), []);
  const removeRoute = useCallback((id) => setRoutes((current) => current.filter((route) => route.id !== id)), []);
  return { routes, addRoute, removeRoute, reorderRoutes, renameRoute, refresh };
}
