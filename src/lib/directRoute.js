/**
 * Rutas directas de la consulta rápida (origen → destino), calculadas en el
 * cliente y sin latencia: no hay motor de rutas ni mapas. Con los recorridos
 * del GTFS (`routes.json`) se respeta el sentido de la marcha: un trayecto
 * A → B solo es directo si algún recorrido pasa por A y, después, por B. Si
 * no se pueden cargar, se cae al cruce plano de las líneas de cada parada
 * (`stopsList.json`), avisando de que el sentido no está verificado. Las rutas
 * con transbordo se delegan en Google Maps.
 */

// Paradas a menos de esto de A o de B cuentan como "la misma" (la de la acera
// de enfrente: en una calle de doble sentido, cada sentido tiene su parada).
export const NEARBY_STOP_M = 150;
// Un metro andando cuesta como 4 en autobús (andar es unas 4 veces más lento):
// bajarse a 20 m del destino casi no penaliza; a 140 m, algo más.
const WALK_COST = 4;
// Recorridos sin metros: distancia media entre paradas de Vitrasa.
const STOP_SPACING_M = 350;
// Rodeo: una línea que tarda más del doble que la mejor (+1 km) no es una
// opción real (p. ej. la circular en el sentido largo); se descarta.
const DETOUR_FACTOR = 2;
const DETOUR_MARGIN_M = 1000;

/**
 * Clave para comparar líneas escritas de forma distinta en los datos abiertos
 * y en la API de tiempos ("PSA 1" / "PSA1", "C3d" / "C3D").
 */
export const lineKey = (line) => String(line).replace(/\s+/g, '').toUpperCase();

/**
 * Líneas que pasan por el origen y por el destino (sin transbordo), en el
 * orden de las del origen. Equivale a
 * `originLines.filter((line) => destinationLines.includes(line))`, pero con
 * un `Set` y sin distinguir mayúsculas ni espacios.
 */
export function findDirectLines(originLines = [], destinationLines = []) {
  const destination = new Set(destinationLines.map(lineKey));
  const seen = new Set();
  return originLines.filter((line) => {
    const key = lineKey(line);
    if (!destination.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Solo las llegadas de las líneas indicadas (las directas). */
export function filterBusesByLines(buses, lines) {
  const keys = new Set(lines.map(lineKey));
  return buses.filter((bus) => keys.has(lineKey(bus.line)));
}

// Punto para la URL de Google Maps: coordenadas exactas o, si no se conocen
// (parada que no está en los datos abiertos), su nombre en Vigo.
function mapsPoint(point) {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lon)) return `${point.lat},${point.lon}`;
  return encodeURIComponent(`${point.name}, Vigo`);
}

/**
 * Enlace universal de Google Maps con la ruta en transporte público (con
 * transbordos si hacen falta). En el móvil, el sistema lo abre en la app de
 * Maps si está instalada. Sin `origin`, Maps parte de la ubicación del
 * usuario.
 */
export function mapsDirectionsUrl(origin, destination) {
  const params = ['api=1'];
  if (origin) params.push(`origin=${mapsPoint(origin)}`);
  params.push(`destination=${mapsPoint(destination)}`, 'travelmode=transit');
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}

/**
 * Letrero de un autobús comparable con el `head` del GTFS, sin tildes,
 * mayúsculas ni signos ("Coia por García Barbón" = "COIA POR GARCIA BARBON").
 */
export const headKey = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ]+/g, ' ')
    .trim();

/**
 * Índice de `routes.json` (`[{ line, dir, head, stops, m }]`): para cada
 * parada, los recorridos que pasan por ella y en qué posición
 * (`byStop: Map<marquesina, [[recorrido, posición], …]>`). Se construye una
 * vez al cargar (unos milisegundos); cada consulta luego solo mira las
 * paradas de A y de B. Los recorridos mal formados se ignoran.
 */
export function buildRouteIndex(routes) {
  const valid = [];
  const byStop = new Map();
  for (const route of Array.isArray(routes) ? routes : []) {
    if (!route || !route.line || !Array.isArray(route.stops) || route.stops.length < 2) continue;
    const index = valid.length;
    valid.push({
      line: String(route.line),
      key: lineKey(route.line),
      headKey: headKey(route.head),
      stops: route.stops,
      m: Array.isArray(route.m) && route.m.length === route.stops.length ? route.m : null,
    });
    route.stops.forEach((stopId, position) => {
      let entries = byStop.get(stopId);
      if (!entries) byStop.set(stopId, (entries = []));
      entries.push([index, position]);
    });
  }
  return { routes: valid, byStop };
}

// Desempate entre líneas con el mismo recorrido: 5A < 10 < C3i.
const lineCollator = new Intl.Collator('es', { numeric: true });

function addTo(map, key, value) {
  let set = map.get(key);
  if (!set) map.set(key, (set = new Set()));
  set.add(value);
}

// Líneas directas subiendo en `from` y bajando en cualquiera de `alightById`.
function planFrom(index, from, alightById) {
  const options = new Map();
  // Letreros de cada línea que llegan a destino (`reach`) y todos los que pasan
  // por la parada de subida (`known`): para el filtro de variantes cortas.
  const reach = new Map();
  const known = new Map();
  for (const [routeIndex, position] of index.byStop.get(from.stop.id) ?? []) {
    const route = index.routes[routeIndex];
    addTo(known, route.key, route.headKey);
    for (let j = position + 1; j < route.stops.length; j++) {
      const target = alightById.get(route.stops[j]);
      if (!target) continue;
      addTo(reach, route.key, route.headKey);
      const metres = route.m ? route.m[j] - route.m[position] : (j - position) * STOP_SPACING_M;
      const cost = metres + WALK_COST * (from.walk + target.walk);
      const current = options.get(route.key);
      if (!current || cost < current.cost) {
        options.set(route.key, { line: route.line, key: route.key, stops: j - position, metres, alight: target.stop, walk: target.walk, cost });
      }
    }
  }
  const sorted = [...options.values()].sort(
    (a, b) => a.cost - b.cost || a.metres - b.metres || a.stops - b.stops || lineCollator.compare(a.line, b.line),
  );
  const limit = sorted.length ? sorted[0].cost * DETOUR_FACTOR + DETOUR_MARGIN_M : 0;
  const kept = sorted.filter((option) => option.cost <= limit);
  for (const key of reach.keys()) if (!kept.some((option) => option.key === key)) reach.delete(key);
  return { boarding: from.stop, boardingWalk: from.walk, options: kept, reach, known };
}

/**
 * Plan de un trayecto A → B con sentido de la marcha. `boarding` y
 * `alighting` son las paradas candidatas (`[{ stop, walk }]`), la primera
 * siempre la elegida (A o B, `walk: 0`) y luego las de alrededor
 * (`NEARBY_STOP_M`).
 *
 * - Se baja en B o en una parada a unos pasos (si a B no llega ninguna línea
 *   en ese sentido, suele llegar a la de enfrente).
 * - Se sube en A; solo si desde A no hay ninguna directa, en la parada de
 *   alrededor que mejor salga (normalmente la de enfrente).
 * - Cada línea con su mejor opción (`metres` = `m[B] − m[A]`, más lo andado),
 *   de menos a más rodeo; las que dan un rodeo absurdo se descartan.
 *
 * Devuelve `null` si A o B no están en los recorridos (no se puede
 * verificar) o `{ boarding, boardingWalk, options, reach, known }` (sin
 * `options`: no hay línea directa en ese sentido).
 */
export function planDirectRoute(index, { boarding, alighting }) {
  const [origin] = boarding;
  const [destination] = alighting;
  if (!index.byStop.has(origin.stop.id) || !index.byStop.has(destination.stop.id)) return null;
  const alightById = new Map();
  for (const candidate of alighting) if (!alightById.has(candidate.stop.id)) alightById.set(candidate.stop.id, candidate);

  const fromOrigin = planFrom(index, origin, alightById);
  if (fromOrigin.options.length) return fromOrigin;
  let best = null;
  for (const candidate of boarding.slice(1)) {
    const plan = planFrom(index, candidate, alightById);
    if (plan.options.length && (!best || plan.options[0].cost < best.options[0].cost)) best = plan;
  }
  return best ?? fromOrigin;
}

/**
 * Autobuses de la parada de subida que llegan de verdad al destino: de una
 * línea directa y con un letrero cuyo recorrido pasa después por B. Los de
 * una variante que acaba antes (o va en el otro sentido) se ocultan; si el
 * letrero no está en el GTFS, no se puede descartar y se enseña. Devuelve
 * `{ buses, hidden }` (`hidden`: autobuses de líneas directas ocultados).
 */
export function filterReachingBuses(buses, plan) {
  const shown = [];
  let hidden = 0;
  for (const bus of buses) {
    const key = lineKey(bus.line);
    const reach = plan.reach.get(key);
    if (!reach) continue;
    const head = headKey(bus.destination);
    if (reach.has(head) || !plan.known.get(key)?.has(head)) shown.push(bus);
    else hidden++;
  }
  return { buses: shown, hidden };
}
