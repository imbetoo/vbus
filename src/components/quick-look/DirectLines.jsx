import { formatDistance, haversineMeters } from '../../lib/geo';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';

// "6 paradas" / "5–6 paradas".
function stopsRange(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return `${min} ${min === 1 ? 'parada' : 'paradas'}`;
  return `${min}–${max} paradas`;
}

// "1,7 km" / "1,7–2 km" / "850 m – 1,2 km" (con unidades distintas, enteras).
function distanceRange(values) {
  const min = formatDistance(Math.min(...values));
  const max = formatDistance(Math.max(...values));
  if (min === max) return min;
  const [minValue, minUnit] = min.split(' ');
  return minUnit === max.split(' ')[1] ? `${minValue}–${max}` : `${min} – ${max}`;
}

// Rodeo: el autobús recorre más del triple que la línea recta (y al menos
// 1,5 km de más). Puede seguir siendo la única directa: se avisa, no se oculta.
const DETOUR_RATIO = 3;
const DETOUR_EXTRA_M = 1500;

/**
 * Líneas directas a destino, de menos a más rodeo (`m[B] − m[A]`), agrupadas
 * por la parada donde hay que bajarse: B o, si en ese sentido no llegan a B,
 * la que está a unos pasos ("Bájate en … · a 20 m de tu destino"). Cada grupo
 * dice cuántas paradas y cuántos km son.
 *
 * Si hasta la mejor da un rodeo enorme (la circular en el sentido largo), se
 * avisa y se sugiere Mapas. Sin recorridos verificados (`options` vacío)
 * solo se enseñan los distintivos de `lines`.
 */
export default function DirectLines({ from, destination, options, lines }) {
  const groups = [];
  if (options.length) {
    const byStop = new Map();
    for (const option of options) {
      let group = byStop.get(option.alight.id);
      if (!group) {
        group = { alight: option.alight, walk: option.walk, options: [] };
        byStop.set(option.alight.id, group);
        groups.push(group);
      }
      group.options.push(option);
    }
  } else {
    groups.push({ alight: destination, walk: 0, options: lines.map((line) => ({ line, key: line })) });
  }
  const count = options.length || lines.length;
  const straight =
    options.length && [from, destination].every((stop) => Number.isFinite(stop?.lat) && Number.isFinite(stop?.lon))
      ? haversineMeters(from, destination)
      : null;
  const best = options[0];
  const detour =
    straight != null && best.metres > straight * DETOUR_RATIO && best.metres - straight > DETOUR_EXTRA_M;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-sm font-medium text-white/60">
        {`${count === 1 ? 'Línea directa' : 'Líneas directas'} a ${destination.name}`}
      </p>
      {groups.map((group) => (
        <div key={group.alight.id} className="mt-2">
          {group.alight.id !== destination.id && (
            <p className="mb-2 text-sm font-medium text-[#409CFF]">
              {`Bájate en ${group.alight.name} · a ${formatDistance(group.walk)} de tu destino`}
            </p>
          )}
          <ul className="flex flex-wrap gap-2" aria-label="Líneas, de menos a más recorrido">
            {group.options.map((option) => (
              <LineBadge as="li" key={option.key} line={option.line} color={lineColor(option.line)} />
            ))}
          </ul>
          {group.options[0].metres != null && (
            <p className="mt-2 text-sm font-medium tabular-nums text-white/60">
              {`${stopsRange(group.options.map((option) => option.stops))} · ${distanceRange(
                group.options.map((option) => option.metres),
              )}`}
            </p>
          )}
        </div>
      ))}
      {detour && (
        <p className="mt-2 text-sm font-medium text-amber-300">
          {`Da un rodeo: ${formatDistance(best.metres)} en autobús para ${formatDistance(
            straight,
          )} en línea recta. Mira también la ruta en Mapas.`}
        </p>
      )}
    </div>
  );
}
