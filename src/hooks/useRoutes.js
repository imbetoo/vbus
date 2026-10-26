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

// Lectura inicial (síncrona, antes del primer render): si no hay nada o el
// JSON está corrupto, se empieza con `[]`.
function loadRoutes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isValidRoute) : [];
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
 * pestaña oculta no se pide nada.
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

  useEffect(() => {
    const controller = new AbortController();

    const refresh = async () => {
      if (document.hidden) return;
      const stopIds = [...new Set(routesRef.current.map((route) => route.stopId).filter(Boolean))];
      if (!stopIds.length) return;
      const results = await Promise.allSettled(
        stopIds.map((stopId) => getBuses(stopId, { all: true, signal: controller.signal })),
      );
      if (controller.signal.aborted) return;
      const fresh = new Map(
        stopIds.flatMap((stopId, i) => (results[i].status === 'fulfilled' ? [[stopId, results[i].value]] : [])),
      );
      if (!fresh.size) return;
      // Actualización funcional: respeta tarjetas creadas o borradas mientras tanto.
      setRoutes((current) =>
        current.map((route) => (fresh.has(route.stopId) ? withFreshBuses(route, fresh.get(route.stopId)) : route)),
      );
    };

    const onVisible = () => {
      if (!document.hidden) refresh();
    };

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      controller.abort();
    };
  }, []);

  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  const removeRoute = useCallback((id) => setRoutes((current) => current.filter((route) => route.id !== id)), []);
  return { routes, addRoute, removeRoute };
}
