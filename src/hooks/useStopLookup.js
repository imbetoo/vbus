import { useEffect, useState } from 'react';
import { getBuses, getStop } from '../services/vigobus';
import { toBusArrivals, toStop } from '../services/vigobusAdapter';

// De momento solo se busca por número de parada (el que aparece en la marquesina).
const STOP_ID = /^\d{1,6}$/;
// Espera a que el usuario deje de escribir antes de pedir la parada.
const DEBOUNCE_MS = 350;

/**
 * Busca una parada por su número mientras se escribe.
 *
 * Devuelve `{ status }` con `status`: `idle` (no es un número), `loading`,
 * `error` (+ `error`, un `VigoBusError`) o `success` (+ `stop` y `buses` ya
 * adaptados para la UI). Cada búsqueda cancela la anterior.
 */
export function useStopLookup(query) {
  const stopId = query.trim();
  const isStopId = STOP_ID.test(stopId);
  // El resultado se guarda junto a la parada a la que corresponde: si el texto
  // cambia, el estado se deriva en render sin tocar estado desde el efecto.
  const [result, setResult] = useState({ key: null });

  useEffect(() => {
    if (!isStopId) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(() => {
      Promise.all([getStop(stopId, { signal }), getBuses(stopId, { all: true, signal })])
        .then(([stop, buses]) => {
          if (signal.aborted) return;
          setResult({ key: stopId, status: 'success', stop: toStop(stop), buses: toBusArrivals(buses).buses });
        })
        .catch((error) => {
          if (signal.aborted) return;
          setResult({ key: stopId, status: 'error', error });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [stopId, isStopId]);

  if (!stopId) return { status: 'idle' };
  if (!isStopId) return { status: 'invalid' };
  return result.key === stopId ? result : { status: 'loading' };
}
