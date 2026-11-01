import { headKey } from './directRoute';
import { lineKey } from './lines';

/**
 * Recorrido de una línea que pasa por una parada, para el visor de línea
 * (`LineTimelineSheet`). Usa el índice de `routes.json` (`buildRouteIndex`).
 *
 * Un recorrido es un sentido concreto con su letrero, así que el sentido de
 * la marcha sale solo: se busca el de la misma línea que pasa por la parada
 * (sin contar la última, donde el autobús ya no recoge) con el mismo letrero
 * que el autobús (`headKey`, como `filterReachingBuses`). Si ninguno lo
 * tiene, el primero que pase por ahí (en `routes.json` van primero los más
 * habituales) con `verified: false`.
 *
 * Devuelve `{ route, position, verified }` o `null` (la línea no pasa por la
 * parada o no hay recorridos).
 */
export function findLineRoute(index, { line, destination, stopId }) {
  const entries = index?.byStop?.get(Number(stopId));
  if (!entries) return null;
  const key = lineKey(line);
  const head = headKey(destination);
  let fallback = null;
  for (const [i, position] of entries) {
    const route = index.routes[i];
    if (!route || route.key !== key || position >= route.stops.length - 1) continue;
    if (head && route.headKey === head) return { route, position, verified: true };
    fallback ??= { route, position, verified: false };
  }
  return fallback;
}
