import { MapPin } from 'lucide-react';
import { splitStopName } from '../../data/stops';

/**
 * Contenido de una fila de parada (sugerencias del buscador y paradas
 * cercanas): icono, nombre entero y, debajo, número de marquesina, distancia
 * (si se pasa, en metros) y líneas que pasan, que distinguen paradas cercanas
 * o enfrentadas en la misma calle.
 */
export default function StopRow({ stop, distance }) {
  const meta = [`Parada ${stop.id}`, distance, stop.lines?.length ? stop.lines.join(', ') : null].filter(Boolean);
  return (
    <>
      <MapPin className="h-5 w-5 shrink-0 text-white/60" strokeWidth={2.25} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <StopName name={stop.name} />
        <span className="mt-0.5 block truncate text-sm font-medium tabular-nums text-white/60">{meta.join(' · ')}</span>
      </span>
    </>
  );
}

/**
 * Nombre de la parada, entero: si no cabe en una línea pasa a la siguiente (en
 * una misma calle hay muchas paradas y el número del portal es lo que las
 * distingue). La última palabra de la calle va pegada al número ("Torrecedeira,
 * 81"), así ", 81" nunca se queda solo en una línea.
 */
function StopName({ name }) {
  const { street, number } = splitStopName(name);
  const cut = number ? street.lastIndexOf(' ') + 1 : street.length;
  return (
    <span className="block break-words text-base/snug font-medium">
      {street.slice(0, cut)}
      <span className="whitespace-nowrap">
        {street.slice(cut)}
        {number}
      </span>
    </span>
  );
}
