import { WifiOff } from 'lucide-react';
import { useT } from '../../i18n';
import PingDot from '../ui/PingDot';
import ArrivalTime from './ArrivalTime';
import LineBadge from './LineBadge';
import { isUrgent } from './urgency';

/**
 * Fila de un autobús: línea, letrero y tiempo. `action`: botón opcional al
 * final (campana de la consulta rápida). `theoretical`: horario teórico del
 * GTFS (la API no responde): tiempo en gris, sin urgencia ni campana y con
 * "Horario teórico" debajo del letrero.
 */
export default function BusLineItem({ line, color, time, destination, timeFormat, fetchedAt, action = null, theoretical = false }) {
  const t = useT();
  const urgent = !theoretical && isUrgent(time);

  if (theoretical) {
    return (
      <li className="flex items-center gap-3 py-2">
        <LineBadge line={line} color={color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold tracking-[-0.01em] text-white/70">{destination}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-white/45">
            <WifiOff className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {t('schedule.theoretical')}
          </span>
        </span>
        <ArrivalTime minutes={time} muted format={timeFormat} fetchedAt={fetchedAt} />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <LineBadge line={line} color={color} />

      <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em]">{destination}</span>

      <span className="flex shrink-0 items-center gap-2">
        <PingDot ping={urgent} className={urgent ? 'bg-urgent' : 'bg-white/80'} />
        <ArrivalTime minutes={time} urgent={urgent} format={timeFormat} fetchedAt={fetchedAt} />
      </span>
      {action}
    </li>
  );
}
