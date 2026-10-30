import { useEffect, useRef, useState } from 'react';
import { haversineMeters, locationErrorStatus } from '../lib/geo';

const SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator;

/**
 * Posición del GPS en continuo (`watchPosition`) mientras `active`. Solo
 * funciona con la app en primer plano (ninguna web puede usar el GPS con la
 * pantalla bloqueada). La ubicación no se guarda.
 *
 * Opciones:
 * - `highAccuracy` (por defecto `true`, modo viaje): con `false`, ubicación
 *   aproximada (wifi/antenas), que gasta mucha menos batería.
 * - `maximumAge`: ms que vale una posición ya conocida.
 * - `minMoveMeters`: solo se actualiza si te has movido al menos esto (el
 *   GPS parpadea: sin esto, cada fijo repintaría quien lo use).
 * - `pauseWhenHidden`: deja de escuchar con la pestaña oculta y vuelve al
 *   volver.
 *
 * Devuelve `{ status, position }`: `status` es `off`, `locating`, `active`,
 * `denied` (sin permiso), `unavailable` (sin señal; se sigue intentando) o
 * `unsupported`; `position`, `{ lat, lon, accuracy }` del último fijo.
 */
export function useWatchPosition(
  active,
  { highAccuracy = true, maximumAge = 5_000, minMoveMeters = 0, pauseWhenHidden = false } = {},
) {
  const [state, setState] = useState({ status: 'locating', position: null });
  const lastRef = useRef(null);

  useEffect(() => {
    if (!active || !SUPPORTED) return undefined;
    let id = null;
    const startWatch = () => {
      if (id != null) return;
      id = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const position = { lat: coords.latitude, lon: coords.longitude, accuracy: coords.accuracy };
          const last = lastRef.current;
          if (last && minMoveMeters > 0 && haversineMeters(last, position) < minMoveMeters) return;
          lastRef.current = position;
          setState({ status: 'active', position });
        },
        (error) =>
          setState((current) => ({
            status: locationErrorStatus(error),
            // Sin señal un momento (túnel): se conserva el último fijo.
            position: error?.code === 1 ? null : current.position,
          })),
        { enableHighAccuracy: highAccuracy, maximumAge, timeout: 30_000 },
      );
    };
    const stopWatch = () => {
      if (id == null) return;
      navigator.geolocation.clearWatch(id);
      id = null;
    };
    const onVisibilityChange = () => (document.hidden ? stopWatch() : startWatch());

    if (!pauseWhenHidden || !document.hidden) startWatch();
    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopWatch();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [active, highAccuracy, maximumAge, minMoveMeters, pauseWhenHidden]);

  if (!active) return { status: 'off', position: null };
  if (!SUPPORTED) return { status: 'unsupported', position: null };
  return state;
}
