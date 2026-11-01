import { CloudOff, WifiOff } from 'lucide-react';
import { useMemo } from 'react';
import { useNow } from '../../hooks/useNow';
import { useSchedules } from '../../hooks/useSchedules';
import { useT } from '../../i18n';
import { theoreticalArrivals } from '../../lib/schedule';
import BusLineItem from './BusLineItem';

// Cada cuánto se recalculan los minutos (el horario no cambia: solo el reloj).
const TICK_MS = 30_000;

/** Aviso sutil en gris: por qué se enseña el horario teórico. */
export function TheoreticalNotice({ offline, className = '' }) {
  const t = useT();
  const Icon = offline ? WifiOff : CloudOff;
  return (
    <p
      role="status"
      className={`flex animate-fade-in items-center gap-2 text-sm font-medium text-white/55 motion-reduce:animate-none ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {t(offline ? 'schedule.offline' : 'schedule.unreachable')}
    </p>
  );
}

/**
 * Próximos autobuses según el horario del GTFS cuando la API de tiempos no
 * responde (Feature #20). Solo se monta con el fallo: su reloj (`useNow`) no
 * repinta nada mientras todo va bien.
 *
 * Mientras los horarios cargan (o si no hay), pinta `fallback` (el error de
 * siempre). `filter` limita las filas (líneas de la tarjeta o que llegan al
 * destino); `limit`, cuántas se enseñan. `onOpenLine({ stopId, bus })`:
 * tocar una fila abre el visor de línea.
 */
export default function TheoreticalArrivals({
  stopId,
  lines = null,
  filter = null,
  limit = 3,
  offline,
  timeFormat,
  fallback = null,
  onOpenLine = null,
}) {
  const t = useT();
  const data = useSchedules(true);
  const now = useNow(TICK_MS);
  const minute = Math.floor(now / 60_000);
  const buses = useMemo(() => {
    if (!data) return null;
    // Se piden de más: el filtro puede quitar varias.
    const all = theoreticalArrivals(data, stopId, { now: minute * 60_000, lines, limit: limit * 6 });
    return (filter ? filter(all) : all).slice(0, limit);
  }, [data, stopId, lines, filter, limit, minute]);

  if (!buses) return fallback;
  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      <TheoreticalNotice offline={offline} className="pb-1 pt-2" />
      {buses.length ? (
        <ul>
          {buses.map((bus) => (
            <BusLineItem
              key={bus.id}
              {...bus}
              timeFormat={timeFormat}
              fetchedAt={minute * 60_000}
              onOpen={onOpenLine ? () => onOpenLine({ stopId, bus }) : null}
            />
          ))}
        </ul>
      ) : (
        <p className="py-3 text-base font-medium text-white/55">{t('schedule.none')}</p>
      )}
    </div>
  );
}
