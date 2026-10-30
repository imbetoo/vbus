import { useEffect, useState } from 'react';
import { locationErrorStatus } from '../lib/geo';

const SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator;

/**
 * Posición del GPS en continuo (`watchPosition`) mientras `active`, para el
 * modo viaje. Solo funciona con la app en primer plano (ninguna web puede
 * usar el GPS con la pantalla bloqueada). La ubicación no se guarda.
 *
 * Devuelve `{ status, position }`: `status` es `off`, `locating`, `active`,
 * `denied` (sin permiso), `unavailable` (sin señal; se sigue intentando) o
 * `unsupported`; `position`, `{ lat, lon, accuracy }` del último fijo.
 */
export function useWatchPosition(active) {
  const [state, setState] = useState({ status: 'locating', position: null });

  useEffect(() => {
    if (!active || !SUPPORTED) return undefined;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({
          status: 'active',
          position: { lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy },
        }),
      (error) =>
        setState((current) => ({
          status: locationErrorStatus(error),
          // Sin señal un momento (túnel): se conserva el último fijo.
          position: error?.code === 1 ? null : current.position,
        })),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  if (!active) return { status: 'off', position: null };
  if (!SUPPORTED) return { status: 'unsupported', position: null };
  return state;
}
