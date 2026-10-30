/**
 * Smart Night Mode: de 23:00 a 06:00 (hora del dispositivo), las líneas
 * nocturnas de Vitrasa (N1, N4: empiezan por "N" seguida de un número) con
 * autobuses de verdad suben arriba, y las diurnas que ya han terminado
 * (sin autobuses o con estimaciones de más de 2 h, que son los de mañana)
 * pierden jerarquía: van a "Servicio diurno finalizado", al final y plegado.
 * No se borra nada.
 */
import { lineKey } from './lines';

export const NIGHT_START_HOUR = 23;
export const NIGHT_END_HOUR = 6;
// Más que esto no es un autobús de esta noche: es el primero de mañana.
export const FAR_MINUTES = 120;

/** ¿Es de noche (23:00–05:59) en `date`? */
export function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** Milisegundos hasta el próximo cambio (las 23:00 o las 06:00). */
export function msUntilNightChange(date = new Date()) {
  const next = new Date(date);
  next.setHours(isNightTime(date) ? NIGHT_END_HOUR : NIGHT_START_HOUR, 0, 0, 0);
  if (next <= date) next.setDate(next.getDate() + 1);
  return next - date;
}

/** ¿Es una línea nocturna? ("N1", "n4"; no "NB" ni las diurnas). */
export const isNightLine = (line) => /^N\d/.test(lineKey(line));

/**
 * Reparte las llegadas (ya ordenadas como toque) para la noche:
 *
 * - `buses`: las nocturnas con tiempo real (≤2 h) primero y luego el resto
 *   que llega esta noche, cada grupo en su orden de antes.
 * - `ended`: servicio diurno finalizado. `buses`, el primero de mañana de
 *   cada línea diurna (más de 2 h); `lines`, las diurnas de `knownLines` (las
 *   de la parada o la tarjeta) sin ningún autobús.
 *
 * Las nocturnas lejanas se quedan en la lista principal (al final): no son
 * "servicio diurno".
 */
export function arrangeForNight(buses, knownLines = []) {
  const night = [];
  const rest = [];
  const ended = [];
  const seen = new Set();
  const endedKeys = new Set();
  for (const bus of buses) {
    const key = lineKey(bus.line);
    seen.add(key);
    if (isNightLine(bus.line)) {
      (bus.time <= FAR_MINUTES ? night : rest).push(bus);
    } else if (bus.time <= FAR_MINUTES) {
      rest.push(bus);
    } else if (!endedKeys.has(key)) {
      endedKeys.add(key);
      ended.push(bus);
    }
  }
  const idle = [];
  for (const line of knownLines) {
    const key = lineKey(line);
    if (isNightLine(line) || seen.has(key)) continue;
    seen.add(key);
    idle.push(line);
  }
  // Una diurna que aún tiene un autobús esta noche no está "finalizada":
  // su autobús de mañana se queda fuera de la sección.
  const runningKeys = new Set(rest.map((bus) => lineKey(bus.line)));
  return {
    buses: [...night, ...rest.sort(byNightLast)],
    ended: { buses: ended.filter((bus) => !runningKeys.has(lineKey(bus.line))), lines: idle },
  };
}

// Las nocturnas lejanas (más de 2 h) detrás de las que llegan esta noche;
// el resto conserva su orden (`sort` es estable).
function byNightLast(a, b) {
  const farA = isNightLine(a.line) && a.time > FAR_MINUTES;
  const farB = isNightLine(b.line) && b.time > FAR_MINUTES;
  return Number(farA) - Number(farB);
}
