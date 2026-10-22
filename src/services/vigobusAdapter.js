import { isUrgent } from '../components/bus/urgency';

/**
 * Adaptadores: transforman las respuestas crudas de VigoBusAPI al formato que
 * usa la UI (el mismo que `src/data/mockRoutes.js` y `BusLineItem`).
 */

// La API no da colores de línea: se asigna uno estable por línea. Clases
// literales para que Tailwind las incluya en el CSS.
const LINE_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-sky-600',
  'bg-orange-600',
  'bg-teal-600',
];

export function lineColor(line) {
  let hash = 0;
  for (const char of String(line)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return LINE_COLORS[hash % LINE_COLORS.length];
}

/**
 * Un autobús de la API → fila de la UI.
 * `{ line, route, time, bus_id }` → `{ id, line, color, destination, time, urgent }`
 * (`time` en minutos; 0 = llegando).
 */
export function toBusArrival(bus) {
  const time = Math.max(0, Number(bus.time) || 0);
  return {
    // `bus_id` es un hash de línea + ruta: se le suma el tiempo para que dos
    // autobuses de la misma línea tengan claves distintas.
    id: `${bus.bus_id ?? `${bus.line}-${bus.route}`}-${time}`,
    line: String(bus.line).trim(),
    color: lineColor(bus.line),
    destination: String(bus.route).trim(),
    time,
    urgent: isUrgent(time),
  };
}

/** Respuesta de `/buses/{id}` → `{ buses, moreBusesAvailable }`, ordenados por llegada. */
export function toBusArrivals(response) {
  return {
    buses: (response?.buses ?? []).map(toBusArrival).sort((a, b) => a.time - b.time),
    moreBusesAvailable: Boolean(response?.more_buses_available),
  };
}

/** Respuesta de `/stop/{id}` → `{ id, name, location }`. */
export function toStop(stop) {
  return {
    id: stop.stop_id,
    name: stop.name,
    location: stop.lat != null && stop.lon != null ? { lat: stop.lat, lon: stop.lon } : null,
  };
}

/** Líneas distintas de una lista de llegadas, en orden de llegada: `[{ line, color }]`. */
export function uniqueLines(buses) {
  const seen = new Map();
  for (const { line, color } of buses) if (!seen.has(line)) seen.set(line, { line, color });
  return [...seen.values()];
}

/**
 * Tarjeta de rutina para el Dashboard (misma forma que `mockRoutes.js`) a
 * partir de una parada, sus llegadas adaptadas y las líneas elegidas. Cada
 * línea muestra su próximo autobús; el resto de pasos van a `moreBuses`
 * ("Ver más autobuses").
 */
export function toRouteCard({ stop, buses, lines }) {
  const next = [];
  const more = [];
  const shown = new Set();
  for (const bus of buses) {
    if (!lines.includes(bus.line)) continue;
    if (shown.has(bus.line)) more.push(bus);
    else {
      shown.add(bus.line);
      next.push(bus);
    }
  }
  return {
    id: crypto.randomUUID(),
    stopId: stop.id,
    title: `Parada ${stop.id}`,
    stopName: stop.name,
    icon: 'Bus',
    lines,
    buses: next,
    moreBuses: more,
  };
}
