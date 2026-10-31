/**
 * Modo viaje (alarma de destino): cálculos puros, sin React ni red.
 *
 * Dos señales independientes deciden cuándo avisar, y gana la primera:
 *
 * 1. Tiempo real de Vitrasa en la parada de BAJADA: cuánto le falta a tu
 *    autobús para llegar allí. Ya incluye el tráfico y se vuelve a pedir
 *    durante todo el viaje, así que un atasco a mitad de camino lo retrasa.
 * 2. GPS (con la app en primer plano sí se puede): dónde estás sobre el
 *    recorrido del GTFS (`routes.json`) y cuántos metros quedan. No depende
 *    del tráfico ni de la red (funciona en modo avión).
 *
 * La API no dice qué autobús es el tuyo (no hay número de vehículo), así que
 * se sigue por continuidad: el que mejor encaja con lo esperado (lo que
 * faltaba la vez anterior menos lo que ha pasado). En la duda se elige el
 * que llega antes: mejor un aviso temprano que pasarse de parada.
 */
import { t } from '../i18n';
import { lineKey } from './lines';

/** Se avisa cuando faltan estos minutos (o menos) para llegar a la parada de bajada. */
export const ALERT_MINUTES = 3;
/** …o cuando el GPS dice que quedan estos metros de recorrido (≈3 min a 15 km/h). */
export const ALERT_METRES = 700;
// Velocidad media de un autobús urbano en Vigo (≈15 km/h), solo para estimar
// cuál de los autobuses de la API es el tuyo, nunca para la hora del aviso.
const BUS_METRES_PER_MINUTE = 250;
// A menos de esto de una parada (sobre el recorrido), ya se está en ella.
const AT_STOP_M = 25;
// Más lejos que esto del recorrido, la posición no cuenta (aún andando a la
// parada, GPS desviado…).
const OFF_ROUTE_M = 300;
// Avanzar esto sobre el recorrido desde la parada de subida = ya vas en el autobús.
export const BOARDED_PROGRESS_M = 150;
// Recorridos sin metros: distancia media entre paradas de Vitrasa.
const STOP_SPACING_M = 350;
// Fijos del GPS menos precisos que esto se ignoran (en interiores, recién
// encendido…).
export const MAX_GPS_ACCURACY_M = 150;

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** Minutos estimados en autobús para `metres` de recorrido. */
export const rideMinutes = (metres) => metres / BUS_METRES_PER_MINUTE;

/**
 * Tramo del recorrido de `line` entre la parada de subida y la de bajada
 * (`{ stops, m }`, `m` en metros desde la subida), o `null` si esa línea no
 * pasa por las dos en ese orden (o no hay recorridos). Si hay varias
 * variantes, la más corta.
 */
export function tripPath(index, { line, boardingId, alightId }) {
  if (!index || line == null) return null;
  const key = lineKey(line);
  let best = null;
  for (const [routeIndex, start] of index.byStop.get(boardingId) ?? []) {
    const route = index.routes[routeIndex];
    if (route.key !== key) continue;
    const end = route.stops.indexOf(alightId, start + 1);
    if (end < 0 || (best && end - start >= best.end - best.start)) continue;
    best = { route, start, end };
  }
  if (!best) return null;
  const { route, start, end } = best;
  const stops = route.stops.slice(start, end + 1);
  const m = route.m
    ? route.m.slice(start, end + 1).map((metres) => metres - route.m[start])
    : stops.map((_, position) => position * STOP_SPACING_M);
  return { stops, m };
}

// Proyección local en metros alrededor de `origin` (equirectangular): a
// escala de un tramo entre paradas, el error es de centímetros.
function toLocal(origin, point) {
  return {
    x: toRadians(point.lon - origin.lon) * Math.cos(toRadians(origin.lat)) * EARTH_RADIUS_M,
    y: toRadians(point.lat - origin.lat) * EARTH_RADIUS_M,
  };
}

/**
 * Dónde está `position` sobre el tramo (`tripPath`), con `coords` las
 * coordenadas de cada parada (`{ lat, lon }` o `null`). Se proyecta sobre el
 * segmento entre paradas más cercano a partir de `fromSegment` (el viaje
 * solo avanza: así un recorrido que pasa dos veces por la misma calle no
 * confunde). Devuelve `null` si no hay coordenadas, o
 * `{ segment, along, remainingMetres, stopsLeft, offRoute }`.
 */
export function routeProgress(path, coords, position, { fromSegment = 0 } = {}) {
  if (!path || !position) return null;
  let best = null;
  for (let i = Math.max(0, fromSegment); i < path.stops.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    if (!a || !b) continue;
    const end = toLocal(a, b);
    const point = toLocal(a, position);
    const lengthSquared = end.x ** 2 + end.y ** 2;
    const t = lengthSquared ? Math.min(1, Math.max(0, (point.x * end.x + point.y * end.y) / lengthSquared)) : 0;
    const distance = Math.hypot(point.x - t * end.x, point.y - t * end.y);
    if (!best || distance < best.distance) best = { segment: i, t, distance };
  }
  if (!best) return null;
  const { segment, t, distance } = best;
  const last = path.stops.length - 1;
  const along = path.m[segment] + t * (path.m[segment + 1] - path.m[segment]);
  return {
    segment,
    along,
    remainingMetres: Math.max(0, path.m[last] - along),
    // Paradas por delante, contando la de bajada (la que se tiene encima ya no cuenta).
    stopsLeft: path.m.filter((metres) => metres > along + AT_STOP_M).length,
    offRoute: distance > OFF_ROUTE_M,
  };
}

/** "1 minuto", "5 minutos". */
export const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/** "Llegando", "1 min", "12 min". */
export const minutesText = (minutes) =>
  minutes < 0.5 ? t('time.arriving') : t('time.minutes', { n: Math.round(minutes) });

/** Minutos que le faltan a `bus` ahora, descontando lo que ha pasado desde que llegó el dato. */
export const etaNow = (bus, fetchedAt, now) => bus.time - Math.max(0, now - fetchedAt) / 60_000;

/**
 * El autobús que se sigue entre `buses` (ordenados por llegada): de una de
 * las líneas de `keys` (claves de `lineKey`; `null` = cualquiera) y con el
 * tiempo más cercano a `expected` (minutos). Sin estimación, el primero que
 * llega. En caso de empate, también el que llega antes.
 */
export function pickBus(buses, { keys = null, expected = null } = {}) {
  let best = null;
  for (const bus of buses) {
    if (keys && !keys.has(lineKey(bus.line))) continue;
    if (expected == null) return bus;
    if (!best || Math.abs(bus.time - expected) < Math.abs(best.time - expected)) best = bus;
  }
  return best;
}

/**
 * ¿Hay que avisar ya? `eta`: minutos que le faltan a tu autobús para la
 * parada de bajada (o `null`); `progress`: lo que dice el GPS (o `null`).
 * Devuelve `eta`, `gps` o `null`.
 */
export function alertReason({ eta, progress }) {
  if (eta != null && eta <= ALERT_MINUTES) return 'eta';
  if (progress && !progress.offRoute && progress.remainingMetres <= ALERT_METRES) return 'gps';
  return null;
}
