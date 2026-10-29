import { useEffect, useState } from 'react';
import { getBuses } from '../services/vigobus';
import { toBusArrivals } from '../services/vigobusAdapter';

/**
 * Llegadas en tiempo real de una parada que NO está guardada (consulta
 * rápida): las pide al abrirla, cada `refreshMs` y al volver a la pestaña,
 * igual que las tarjetas, pero sin tocar `vbus:routes`. Si un refresco falla,
 * se conservan los últimos tiempos.
 *
 * Devuelve `{ status, buses, updatedAt, error }` con `status`: `loading`
 * (aún sin datos), `success` o `error` (sin datos que enseñar).
 */
export function useStopArrivals(stopId, { refreshMs = 30_000 } = {}) {
  const [state, setState] = useState({ stopId, status: 'loading', buses: [] });

  useEffect(() => {
    if (!stopId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    const load = () => {
      if (document.hidden) return;
      getBuses(stopId, { all: true, signal })
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
        });
    };
    load();
    const interval = setInterval(load, refreshMs);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
    };
  }, [stopId, refreshMs]);

  // Datos de otra parada (se acaba de cambiar): aún cargando.
  return state.stopId === stopId ? state : { stopId, status: 'loading', buses: [] };
}
