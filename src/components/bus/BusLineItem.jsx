import { WifiOff } from 'lucide-react';
import { useT } from '../../i18n';
import PingDot from '../ui/PingDot';
import { PRESSABLE } from '../ui/pressable';
import ArrivalTime from './ArrivalTime';
import LineBadge from './LineBadge';
import { isUrgent } from './urgency';

/**
 * Fila de un autobús: línea, letrero y tiempo. `action`: botón opcional al
 * final (campana del modo salida). `theoretical`: horario teórico del GTFS
 * (la API no responde): tiempo en gris, sin urgencia ni campana y con
 * "Horario teórico" debajo del letrero. `onOpen`: si llega, tocar la fila
 * (menos la campana, que es un botón aparte) abre el visor de línea.
 */
export default function BusLineItem({
  line,
  color,
  time,
  destination,
  timeFormat,
  fetchedAt,
  action = null,
  theoretical = false,
  onOpen = null,
}) {
  const t = useT();
  const urgent = !theoretical && isUrgent(time);

  const content = theoretical ? (
    <>
      <LineBadge line={line} color={color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-semibold tracking-[-0.01em] text-white/70">{destination}</span>
        <span className="flex items-center gap-1 text-xs font-medium text-white/45">
          <WifiOff className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {t('schedule.theoretical')}
        </span>
      </span>
      <ArrivalTime minutes={time} muted format={timeFormat} fetchedAt={fetchedAt} />
    </>
  ) : (
    <>
      <LineBadge line={line} color={color} />
      <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em]">{destination}</span>
      <span className="flex shrink-0 items-center gap-2">
        <PingDot ping={urgent} className={urgent ? 'bg-urgent' : 'bg-white/80'} />
        <ArrivalTime minutes={time} urgent={urgent} format={timeFormat} fetchedAt={fetchedAt} />
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 py-2">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className={`-mx-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${PRESSABLE}`}
        >
          {content}
          <span className="sr-only">{`. ${t('timeline.open', { line, head: destination })}`}</span>
        </button>
      ) : (
        content
      )}
      {!theoretical && action}
    </li>
  );
}
