/**
 * Tarjetas inteligentes por GPS: la tarjeta de la parada que tienes más
 * cerca sube la primera. Solo es una vista: el orden manual (`vbus:routes`,
 * el del arrastre) no se toca nunca.
 */
import { haversineMeters } from './geo';

// Más lejos que esto de todas tus paradas (otra ciudad, de viaje), no se
// reordena nada: no aporta.
export const PROXIMITY_MAX_M = 2_000;
// El GPS no avisa de cambios menores que esto (evita repintar con cada
// parpadeo de la señal).
export const PROXIMITY_MIN_MOVE_M = 50;
// Para cambiar de "la más cercana", otra tiene que estar al menos esto más
// cerca: entre dos paradas casi a la misma distancia, las tarjetas no bailan.
const SWITCH_MARGIN_M = 30;

/**
 * Distancia de `position` a la parada de cada tarjeta, de la más cercana a la
 * más lejana: `[{ id, meters }]`. `coordsOf(route)` da `{ lat, lon }` o
 * `null` (las tarjetas sin coordenadas no cuentan).
 */
export function rankByDistance(routes, position, coordsOf) {
  if (!position) return [];
  const ranked = [];
  for (const route of routes) {
    const coords = coordsOf(route);
    if (coords) ranked.push({ id: route.id, meters: haversineMeters(position, coords) });
  }
  return ranked.sort((a, b) => a.meters - b.meters);
}

/**
 * La tarjeta más cercana con histéresis: se mantiene `currentId` salvo que
 * otra esté claramente más cerca. Devuelve `{ id, meters }` o `null` (nada
 * a menos de 2 km).
 */
export function chooseNearest(ranked, currentId) {
  const best = ranked[0];
  if (!best || best.meters > PROXIMITY_MAX_M) return null;
  const current = currentId != null ? ranked.find((entry) => entry.id === currentId) : null;
  if (!current || current.meters > PROXIMITY_MAX_M) return best;
  return best.meters + SWITCH_MARGIN_M < current.meters ? best : current;
}

/** El orden que se enseña: la más cercana primero y el resto en tu orden. */
export function withNearestFirst(routes, nearestId) {
  const index = routes.findIndex((route) => route.id === nearestId);
  if (index <= 0) return routes;
  return [routes[index], ...routes.slice(0, index), ...routes.slice(index + 1)];
}
