import { CARD_SLOTS } from '../lib/cardSlots';
import { isUrgent } from '../components/bus/urgency';
import { busesOfLines, lineKey } from '../lib/lines';

/** Largo máximo de la nota de una tarjeta. */
export const NOTE_MAX = 60;

/**
 * Adaptadores: transforman las respuestas crudas de VigoBusAPI al formato que
 * usa la UI (`RouteCard` y `BusLineItem`).
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
 * Tarjeta de rutina para el Dashboard (la que recibe `RouteCard`) a partir de
 * una parada, sus llegadas adaptadas y lo que eligió el usuario:
 * - `lines`: en el orden en que las eligió (su prioridad); `buses` guarda las
 *   llegadas de esas líneas y la tarjeta las ordena según los ajustes
 *   (`sortBuses`).
 * - `title`: nombre personalizado; si queda vacío, el nombre de la parada.
 * - `busesToShow`: autobuses visibles en esta tarjeta sin desplegar (2 o 3).
 * - `color`: id del color de su icono (`cardColors.js`).
 */
export function toRouteCard({
  stop,
  buses,
  lines,
  title = '',
  note = '',
  busesToShow = 3,
  color = 'graphite',
  slot = 'any',
}) {
  const alias = title.trim();
  return {
    id: crypto.randomUUID(),
    stopId: stop.id,
    // `alias`: nombre propio de la tarjeta ("Trabajo 💻"), vacío si no tiene.
    // `title`: lo que se enseña (el alias o, si no hay, el nombre de la parada).
    alias,
    title: alias || stop.name,
    stopName: stop.name,
    // `note`: nota propia, opcional ("Coger el de las 8:10"), hasta 60 caracteres.
    note: note.trim().slice(0, NOTE_MAX),
    // `slot`: momento del día en que sube arriba (`cardSlots.js`; `any` = nunca).
    slot: CARD_SLOTS.includes(slot) ? slot : 'any',
    icon: 'Bus',
    lines,
    busesToShow,
    color,
    buses: busesOfLines(buses, lines),
    // Cuándo se pidieron los tiempos: base de la hora de llegada absoluta.
    updatedAt: Date.now(),
  };
}

/**
 * Tarjeta con sus llegadas actualizadas a partir de una respuesta nueva de
 * `/buses/{id}`: conserva toda la personalización y se queda solo con las
 * líneas elegidas.
 */
export function withFreshBuses(route, response) {
  const { buses } = toBusArrivals(response);
  return { ...route, buses: busesOfLines(buses, route.lines), updatedAt: Date.now() };
}

/**
 * Ordena las llegadas de una tarjeta según el ajuste "Ordenar por":
 * - `time`: de menos a más minutos.
 * - `preference`: primero el próximo autobús de cada línea en el orden de
 *   prioridad de `lines` y, después, el resto por hora (así las líneas
 *   favoritas ocupan los primeros huecos visibles).
 */
export function sortBuses(buses, lines = [], sortBy = 'time') {
  const byTime = [...buses].sort((a, b) => a.time - b.time);
  if (sortBy !== 'preference') return byTime;
  const next = lines.map((line) => byTime.find((bus) => lineKey(bus.line) === lineKey(line))).filter(Boolean);
  return [...next, ...byTime.filter((bus) => !next.includes(bus))];
}
