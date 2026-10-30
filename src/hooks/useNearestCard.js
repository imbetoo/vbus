import { useEffect, useMemo, useState } from 'react';
import { loadStopsList, stopById } from '../data/stops';
import { PROXIMITY_MIN_MOVE_M, chooseNearest, rankByDistance } from '../lib/proximity';
import { useWatchPosition } from './useWatchPosition';

// Coordenadas de la parada de una tarjeta (las tarjetas solo guardan el número).
function coordsOf(route) {
  const stop = stopById(route.stopId);
  return stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lon) ? stop : null;
}

/**
 * Tarjeta de la parada más cercana a ti (Smart Sorting de Mis rutas), o
 * `null`. Con `enabled` y al menos dos tarjetas, escucha la ubicación
 * aproximada (wifi/antenas: de sobra para distinguir paradas y gasta poca
 * batería), solo con la app a la vista y solo cuando te mueves 50 m o más:
 * el cálculo (Haversine contra unas pocas tarjetas) se rehace únicamente
 * entonces. Con histéresis (`chooseNearest`), dos paradas casi a la misma
 * distancia no se turnan el primer puesto.
 *
 * Devuelve `{ nearest: { id, meters } | null, status }` (`status` del GPS:
 * `denied` si no hay permiso, etc.). `meters` va redondeado a 10 m, así las
 * tarjetas memorizadas no se repintan por unos metros.
 */
export function useNearestCard(routes, enabled) {
  const active = enabled && routes.length > 1;
  const [stopsReady, setStopsReady] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    loadStopsList().then(
      () => alive && setStopsReady(true),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [active]);

  const gps = useWatchPosition(active, {
    highAccuracy: false,
    maximumAge: 60_000,
    minMoveMeters: PROXIMITY_MIN_MOVE_M,
    pauseWhenHidden: true,
  });
  const ranked = useMemo(
    () => (active && stopsReady ? rankByDistance(routes, gps.position, coordsOf) : []),
    [active, stopsReady, routes, gps.position],
  );

  // La elegida se recuerda para la histéresis (estado ajustado en render).
  const [nearestId, setNearestId] = useState(null);
  const chosen = chooseNearest(ranked, nearestId);
  const chosenId = chosen?.id ?? null;
  if (chosenId !== nearestId) setNearestId(chosenId);

  const meters = chosen ? Math.round(chosen.meters / 10) * 10 : null;
  const nearest = useMemo(() => (chosenId != null ? { id: chosenId, meters } : null), [chosenId, meters]);
  return { nearest, status: gps.status };
}
