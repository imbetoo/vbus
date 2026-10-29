import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStopsList, nearestStops } from '../data/stops';
import { OUTSIDE_VIGO_M, getCurrentPosition, locationErrorStatus } from '../lib/geo';

/**
 * "Mi ubicación actual" de la consulta rápida: pide la posición al GPS y, con
 * Haversine (`nearestStops`), la ancla a la parada de Vitrasa más cercana.
 * `locate()` lo pide (o lo vuelve a pedir); la ubicación no se guarda.
 *
 * Devuelve `{ status, stop, position, nearestMeters, locate }`, con `status`:
 * `idle`, `locating`, `done` (`stop` con su `distance` en metros y `position`
 * del usuario), `denied` (sin permiso), `unavailable` (sin señal o tiempo
 * agotado), `unsupported` (navegador sin GPS) u `outside` (fuera de Vigo:
 * parada más cercana a más de 15 km, en `nearestMeters`). Al volver a
 * localizar se conserva la parada anterior hasta tener la nueva, así la
 * interfaz no parpadea.
 */
export function useNearestStop() {
  const [state, setState] = useState({ status: 'idle', stop: null, position: null });
  // Cada petición lleva un número: las respuestas de una petición anterior (o
  // que llegan con el panel ya cerrado) se descartan.
  const requestRef = useRef(0);
  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  const locate = useCallback(() => {
    const request = ++requestRef.current;
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported', stop: null, position: null });
      return;
    }
    setState((current) => ({ ...current, status: 'locating' }));
    Promise.all([getCurrentPosition(), loadStopsList()])
      .then(([position]) => {
        if (request !== requestRef.current) return;
        const { stops, nearestMeters } = nearestStops(position, { limit: 1 });
        setState(
          stops.length && nearestMeters <= OUTSIDE_VIGO_M
            ? { status: 'done', stop: stops[0], position }
            : { status: 'outside', stop: null, position: null, nearestMeters },
        );
      })
      .catch((error) => {
        if (request !== requestRef.current) return;
        setState({ status: locationErrorStatus(error), stop: null, position: null });
      });
  }, []);

  return { ...state, locate };
}
