import { lineColor } from '../services/vigobusAdapter';
import { lineKey } from './lines';

/**
 * Próximos autobuses según el horario teórico del GTFS (`schedules.json`):
 * el plan B cuando la API de tiempos no responde (Feature #20). Todo puro.
 *
 * Datos: `{ svc: { id: [días, inicio, fin, [+fechas], [-fechas]] },
 * p: [{ line, head, stops, off, t: { id: [salidas en deltas] } }] }`. La
 * llegada a una parada es la salida de la primera + `off[posición]`.
 */

// Hasta qué distancia en el futuro se buscan autobuses (minutos).
export const HORIZON_MIN = 120;

// Por objeto de datos: índice parada → [[patrón, posición]] y salidas decodificadas.
const indexes = new WeakMap();

function indexOf(data) {
  let index = indexes.get(data);
  if (index) return index;
  const byStop = new Map();
  data.p.forEach((pattern, p) => {
    // La última parada no cuenta: ahí el autobús termina y no recoge.
    for (let i = 0; i < pattern.stops.length - 1; i++) {
      const id = pattern.stops[i];
      if (!byStop.has(id)) byStop.set(id, []);
      byStop.get(id).push([p, i]);
    }
  });
  index = { byStop, starts: new Map() };
  indexes.set(data, index);
  return index;
}

/** Salidas absolutas (minutos) de un patrón y servicio, decodificadas una vez. */
function startsOf(index, data, p, service) {
  const key = `${p}|${service}`;
  let starts = index.starts.get(key);
  if (!starts) {
    let value = 0;
    starts = (data.p[p].t[service] ?? []).map((delta, i) => (value = i ? value + delta : delta));
    index.starts.set(key, starts);
  }
  return starts;
}

const ymd = (date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

/** Si un servicio circula el día `date` (fecha local). */
export function serviceRuns(entry, date) {
  if (!Array.isArray(entry)) return true;
  const [days, start, end, added = [], removed = []] = entry;
  const day = ymd(date);
  if (removed.includes(day)) return false;
  if (added.includes(day)) return true;
  if (start && day < start) return false;
  if (end && day > end) return false;
  return String(days ?? '')[(date.getDay() + 6) % 7] === '1';
}

/**
 * Los `limit` próximos autobuses teóricos de la parada `stopId` en las
 * próximas 2 h, con la forma de las llegadas de la API (`toBusArrival`) y
 * `theoretical: true`. `lines` (opcional) los limita a esas líneas. Incluye
 * los viajes del día de servicio anterior que pasan de medianoche (horas del
 * GTFS de más de 24).
 */
export function theoreticalArrivals(data, stopId, { now = Date.now(), lines = null, limit = 3 } = {}) {
  if (!data?.p?.length || stopId == null) return [];
  const index = indexOf(data);
  const entries = index.byStop.get(Number(stopId));
  if (!entries) return [];
  const wanted = lines?.length ? new Set(lines.map(lineKey)) : null;
  const date = new Date(now);
  const nowMin = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  // [fecha del día de servicio, minutos de "ahora" en ese día].
  const days = [
    [date, nowMin],
    [yesterday, nowMin + 1440],
  ];

  const found = new Map();
  for (const [p, position] of entries) {
    const pattern = data.p[p];
    if (wanted && !wanted.has(lineKey(pattern.line))) continue;
    const offset = pattern.off[position] ?? 0;
    for (const service of Object.keys(pattern.t)) {
      const entry = data.svc?.[service];
      for (const [day, current] of days) {
        if (!serviceRuns(entry, day)) continue;
        for (const start of startsOf(index, data, p, service)) {
          const arrival = start + offset;
          if (arrival < Math.floor(current)) continue;
          if (arrival > current + HORIZON_MIN) break;
          const time = Math.max(0, Math.round(arrival - current));
          // Dos recorridos con el mismo letrero que comparten la parada: uno solo.
          const key = `${lineKey(pattern.line)}|${pattern.head}|${time}`;
          if (!found.has(key)) {
            found.set(key, {
              id: `teo-${pattern.line}-${p}-${start}-${time}`,
              line: pattern.line,
              color: lineColor(pattern.line),
              destination: pattern.head,
              time,
              urgent: false,
              theoretical: true,
            });
          }
        }
      }
    }
  }
  return [...found.values()].sort((a, b) => a.time - b.time).slice(0, limit);
}
