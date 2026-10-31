import { useT } from '../../i18n';

// Hora de 24 h («12:45»): igual en los tres idiomas.
const clock = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/**
 * Cuándo llega el autobús ("Llegando" a 0). En rojo si es urgente.
 * - `format="relative"`: minutos que faltan ("5 min").
 * - `format="absolute"`: hora de llegada ("12:45"), sumando los minutos a la
 *   hora en que se pidieron los datos (`fetchedAt`), así la hora no se mueve
 *   entre refrescos. Sin `fetchedAt` (tarjeta aún sin refrescar), en minutos.
 */
export default function ArrivalTime({ minutes, urgent, format = 'relative', fetchedAt }) {
  const t = useT();
  const arrivesAt = format === 'absolute' && fetchedAt ? new Date(fetchedAt + minutes * 60_000) : null;

  return (
    <span
      className={`whitespace-nowrap text-lg font-semibold tabular-nums ${urgent ? 'text-urgent' : 'text-white'}`}
    >
      {minutes <= 0 ? (
        t('time.arriving')
      ) : arrivesAt ? (
        <>
          <span className="sr-only">{`${t('arrival.at')} `}</span>
          <time dateTime={arrivesAt.toISOString()}>{clock.format(arrivesAt)}</time>
        </>
      ) : (
        <>
          <span className="sr-only">{`${t('arrival.in')} `}</span>
          {t('time.minutes', { n: minutes })}
        </>
      )}
    </span>
  );
}
