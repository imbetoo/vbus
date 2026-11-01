import { useCallback, useEffect, useRef, useState } from 'react';
import { getBuses } from '../services/vigobus';
import { busesOfLines } from '../lib/lines';
import { newCards } from '../lib/routesShare';
import { NOTE_MAX, withFreshBuses } from '../services/vigobusAdapter';

const STORAGE_KEY = 'vbus:routes';
// Por defecto, los tiempos de todas las tarjetas se piden de nuevo cada 30 s
// (ajuste "Actualizar datos": 15, 30 o 60 s).
const DEFAULT_REFRESH_MS = 30_000;

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
export function useRoutes({ refreshMs = DEFAULT_REFRESH_MS } = {}) {
  const [routes, setRoutes] = useState(loadRoutes);
  // Paradas cuyo último refresco falló: parada → tipo de error (`offline`,
  // `timeout`, `network`…). Sin guardar: con ellas, la tarjeta enseña el
  // horario teórico (Feature #20). Mismo objeto si nada cambia (sin repintar).
  const [failures, setFailures] = useState(() => new Map());

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

  // Un refresco a la vez: el intervalo, volver a la pestaña, volver la
  // conexión y "tirar para actualizar" comparten el que esté en curso (con
  // Lie-Fi cada uno tarda hasta ~4 s en darse por perdido).
  const inFlightRef = useRef(null);
  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current;
    const run = async () => {
      const { signal } = abortRef.current;
      const stopIds = [...new Set(routesRef.current.map((route) => route.stopId).filter(Boolean))];
      if (!stopIds.length) return;
      // `Promise.resolve().then`: un error síncrono de `getBuses` (id no
      // válido) queda como rechazo de esa parada, no rompe el refresco.
      const results = await Promise.allSettled(
        stopIds.map((stopId) => Promise.resolve().then(() => getBuses(stopId, { all: true, signal }))),
      );
      if (signal.aborted) return;
      const failed = new Map(
        stopIds.flatMap((stopId, i) =>
          results[i].status === 'rejected' ? [[stopId, results[i].reason?.kind ?? 'upstream']] : [],
        ),
      );
      setFailures((current) =>
        current.size === failed.size && [...failed].every(([id, kind]) => current.get(id) === kind) ? current : failed,
      );
      const fresh = new Map(
        stopIds.flatMap((stopId, i) => (results[i].status === 'fulfilled' ? [[stopId, results[i].value]] : [])),
      );
      if (!fresh.size) return;
      // Actualización funcional: respeta tarjetas creadas o borradas mientras tanto.
      setRoutes((current) =>
        current.map((route) => (fresh.has(route.stopId) ? withFreshBuses(route, fresh.get(route.stopId)) : route)),
      );
    };
    // Nunca rechaza: quien la llama sin esperar no deja promesas huérfanas.
    inFlightRef.current = run()
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = null;
      });
    return inFlightRef.current;
  }, []);

  // Al abrir la app y al volver a la pestaña.
  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const refreshIfVisible = () => {
      if (!document.hidden) refresh();
    };
    refreshIfVisible();
    document.addEventListener('visibilitychange', refreshIfVisible);
    // Al volver la conexión (salir del modo avión), tiempos al momento.
    window.addEventListener('online', refreshIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('online', refreshIfVisible);
      controller.abort();
    };
  }, [refresh]);

  // Cada `refreshMs`: al cambiar el ajuste, el intervalo se rehace con el
  // nuevo ritmo (sin pedir nada extra en ese momento).
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  // "Editar tarjeta": alias (vacío = sin alias: vuelve el nombre de la parada),
  // nota (vacía = sin nota) y `lines`, las líneas visibles en orden de prioridad. Las llegadas de las
  // líneas ocultas se quitan ya; las de las que se vuelven a mostrar llegan con
  // el siguiente refresco.
  const updateRoute = useCallback(
    (id, { alias, lines, note }) =>
      setRoutes((current) =>
        current.map((route) => {
          if (route.id !== id) return route;
          const clean = (alias ?? route.alias ?? '').trim();
          const visible = lines?.length ? lines : route.lines;
          return {
            ...route,
            alias: clean,
            note: (note ?? route.note ?? '').trim().slice(0, NOTE_MAX),
            title: clean || route.stopName || route.title,
            lines: visible,
            buses: busesOfLines(route.buses, visible),
          };
        }),
      ),
    [],
  );
  // Nuevo orden tras arrastrar en modo edición (se guarda con el efecto de arriba).
  const reorderRoutes = useCallback((ordered) => setRoutes(ordered), []);
  const removeRoute = useCallback((id) => setRoutes((current) => current.filter((route) => route.id !== id)), []);
  // Tarjetas recibidas por enlace (`routesShare.js`): `merge` añade al final
  // las que no estén ya (sin duplicados exactos); `replace` sustituye todas.
  // Llegan sin tiempos: se piden al momento. Devuelve cuántas se añadieron.
  const importRoutes = useCallback(
    (cards, mode) => {
      const current = routesRef.current;
      const added = mode === 'replace' ? cards : newCards(current, cards);
      const next = mode === 'replace' ? cards : [...current, ...added];
      routesRef.current = next;
      setRoutes(next);
      refresh();
      return added.length;
    },
    [refresh],
  );
  return { routes, failures, addRoute, removeRoute, reorderRoutes, updateRoute, importRoutes, refresh };
}
