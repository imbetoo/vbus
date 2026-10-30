import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBuses } from '../services/vigobus';
import { toBusArrivals } from '../services/vigobusAdapter';

/**
 * Llegadas en tiempo real de una parada que NO está guardada (consulta
 * rápida): las pide al abrirla, cada `refreshMs` y al volver a la pestaña,
 * igual que las tarjetas, pero sin tocar `vbus:routes`, y al volver la
 * conexión. Si un refresco falla, se conservan los últimos tiempos (con el
 * error al lado). Sin internet (modo avión o Lie-Fi) el error es de tipo
 * `offline` en ≤4 s: nunca se queda cargando.
 *
 * Con la pestaña oculta no se pide nada, salvo con `background` (modo viaje:
 * en Android la página sigue viva un rato y el aviso puede llegar igual).
 *
 * Devuelve `{ status, buses, updatedAt, error, refresh }` con `status`:
 * `loading` (aún sin datos), `success` o `error` (sin datos que enseñar).
 * `refresh()` (estable) pide los tiempos ya ("tirar para actualizar") y
 * devuelve una promesa que se cumple al llegar (nunca se rechaza); si ya hay
 * una petición en vuelo, la de esa.
 */
export function useStopArrivals(stopId, { refreshMs = 30_000, background = false } = {}) {
  const [state, setState] = useState({ stopId, status: 'loading', buses: [] });
  const loadRef = useRef(null);

  useEffect(() => {
    if (!stopId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    // Una petición a la vez: con Lie-Fi cada una tarda hasta ~4 s en darse por
    // perdida y no deben amontonarse.
    let inFlight = null;
    const load = () => {
      if (inFlight) return inFlight;
      if (document.hidden && !background) return Promise.resolve();
      // `Promise.resolve().then`: un error síncrono (p. ej. un id no válido)
      // también acaba en `catch`, nunca suelto.
      inFlight = Promise.resolve()
        .then(() => getBuses(stopId, { all: true, signal }))
        .then((response) => {
          if (signal.aborted) return;
          setState({ stopId, status: 'success', buses: toBusArrivals(response).buses, updatedAt: Date.now() });
        })
        .catch((error) => {
          if (signal.aborted) return;
          setState((current) =>
            current.stopId === stopId && current.status === 'success'
              ? { ...current, error }
              : { stopId, status: 'error', buses: [], error },
          );
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    };
    loadRef.current = load;
    load();
    const interval = setInterval(load, refreshMs);
    document.addEventListener('visibilitychange', load);
    // Al volver la conexión (salir del modo avión), tiempos al momento.
    window.addEventListener('online', load);
    return () => {
      if (loadRef.current === load) loadRef.current = null;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('online', load);
    };
  }, [stopId, refreshMs, background]);

  const refresh = useCallback(() => loadRef.current?.() ?? Promise.resolve(), []);

  // Datos de otra parada (se acaba de cambiar): aún cargando. Memorizado: los
  // resultados (`React.memo`) solo se repintan cuando llegan datos.
  return useMemo(
    () => (state.stopId === stopId ? { ...state, refresh } : { stopId, status: 'loading', buses: [], refresh }),
    [state, stopId, refresh],
  );
}
