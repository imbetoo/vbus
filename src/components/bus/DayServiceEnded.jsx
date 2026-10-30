import { useId, useState } from 'react';
import { lineColor } from '../../services/vigobusAdapter';
import Collapse from '../ui/Collapse';
import DisclosureButton from '../ui/DisclosureButton';
import LineBadge from './LineBadge';

const clock = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/**
 * "Servicio diurno finalizado" (Smart Night Mode): las líneas diurnas que ya
 * no pasan esta noche, al final de la lista y plegadas, sin jerarquía (gris,
 * a media opacidad y sin campana). No se borran: desplegando se ve el primer
 * autobús de mañana de cada una ("Primero a las 06:35") o que no hay ninguno.
 * `ended` = `{ buses, lines }` (`arrangeForNight`); `fetchedAt`: hora de los
 * tiempos, para pasar los minutos a hora.
 */
export default function DayServiceEnded({ ended, fetchedAt }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const count = ended.buses.length + ended.lines.length;
  if (!count) return null;

  return (
    <div className="mt-1 border-t border-white/10 pt-2">
      <DisclosureButton expanded={open} onToggle={() => setOpen((value) => !value)} controls={id}>
        <span className="text-white/55">{`Servicio diurno finalizado · ${count} ${count === 1 ? 'línea' : 'líneas'}`}</span>
      </DisclosureButton>
      <Collapse id={id} open={open}>
        <ul className="pb-1 opacity-50 grayscale" aria-label="Líneas diurnas que ya no pasan esta noche">
          {ended.buses.map((bus) => (
            <li key={bus.id ?? `${bus.line}-${bus.time}`} className="flex items-center gap-3 py-1.5">
              <LineBadge line={bus.line} color={lineColor(bus.line)} />
              <span className="min-w-0 flex-1 truncate text-base font-medium">{bus.destination}</span>
              <span className="shrink-0 whitespace-nowrap text-base font-medium tabular-nums">
                {fetchedAt ? `Primero a las ${clock.format(new Date(fetchedAt + bus.time * 60_000))}` : `${bus.time} min`}
              </span>
            </li>
          ))}
          {ended.lines.map((line) => (
            <li key={line} className="flex items-center gap-3 py-1.5">
              <LineBadge line={line} color={lineColor(line)} />
              <span className="min-w-0 flex-1 truncate text-base font-medium">Sin autobuses hasta mañana</span>
            </li>
          ))}
        </ul>
      </Collapse>
    </div>
  );
}
