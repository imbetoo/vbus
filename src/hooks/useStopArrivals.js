import { useEffect, useState } from 'react';
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
 * Devuelve `{ status, buses, updatedAt, error }` con `status`: `loading`
 * (aún sin datos), `success` o `error` (sin datos que enseñar).
 */
export function useStopArrivals(stopId, { refreshMs = 30_000, background = false } = {}) {
  const [state, setState] = useState({ stopId, status: 'loading', buses: [] });

  useEffect(() => {
    if (!stopId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    // Una petición a la vez: con Lie-Fi cada una tarda hasta ~4 s en darse por
    // perdida y no deben amontonarse.
    let inFlight = false;
    const load = () => {
      if ((document.hidden && !background) || inFlight) return;
      inFlight = true;
      // `Promise.resolve().then`: un error síncrono (p. ej. un id no válido)
      // también acaba en `catch`, nunca suelto.
      Promise.resolve()
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
          inFlight = false;
        });
    };
    load();
    const interval = setInterval(load, refreshMs);
    document.addEventListener('visibilitychange', load);
    // Al volver la conexión (salir del modo avión), tiempos al momento.
    window.addEventListener('online', load);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
      window.removeEventListener('online', load);
    };
  }, [stopId, refreshMs, background]);

  // Datos de otra parada (se acaba de cambiar): aún cargando.
  return state.stopId === stopId ? state : { stopId, status: 'loading', buses: [] };
}
