import { CircleAlert, DoorOpen, WifiOff } from 'lucide-react';
import { useId, useState } from 'react';
import { useDeparture } from '../../hooks/useDeparture';
import { whenLeft } from '../../lib/departure';
import { minutesText } from '../../lib/tripTracker';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import { AlarmPanel, FocusDialog, FocusLayout, NotificationStatus, PANEL, ScreenStatus, StatusRow } from '../focus/FocusScreen';

/**
 * Modo salida a pantalla completa (`FocusDialog`: negro puro, la pantalla se
 * queda encendida hasta el aviso). `departure` = `{ stop, bus, fetchedAt,
 * lead }` o `null` (cerrado).
 */
export default function DepartureSheet({ departure, notifications, onEnd }) {
  const titleId = useId();
  // Lo último sigue pintado mientras la pantalla sale.
  const [shown, setShown] = useState(departure);
  if (departure && departure !== shown) setShown(departure);

  return (
    <FocusDialog open={Boolean(departure)} onClose={onEnd} labelledBy={titleId}>
      {shown && <DepartureView key={shown.bus.id} departure={shown} notifications={notifications} titleId={titleId} onEnd={onEnd} />}
    </FocusDialog>
  );
}

function DepartureView({ departure, notifications, titleId, onEnd }) {
  const { stop, lead } = departure;
  const { eta, line, destination, alarm, lost, status, error } = useDeparture(departure, { onEnd });

  return (
    <FocusLayout icon={DoorOpen} label="Modo salida" endLabel="Cancelar aviso" onEnd={onEnd} showFooter={!alarm}>
      <h2 id={titleId} className="text-3xl font-bold tracking-tight">
        {`Esperando al ${line}`}
      </h2>
      <p className="mt-1 text-pretty text-base font-medium text-white/60">
        {`${destination} · en ${stop.name} (parada ${stop.id})`}
      </p>

      <div className="mt-5">
        {alarm ? (
          <AlarmPanel title="¡Es hora de salir!" text={alarm.text} onDone={onEnd} />
        ) : (
          <section className={`${PANEL} p-5`} aria-label="Tu autobús">
            <p className="text-lg font-medium text-white/80">{`Te avisaremos ${whenLeft(lead)}.`}</p>
            <p className="mt-4 text-base font-medium text-white/60">Tiempo actual estimado</p>
            <div className="mt-1 flex items-center gap-3">
              <LineBadge line={line} color={lineColor(line)} />
              <p className="text-6xl font-bold tabular-nums tracking-tight">{minutesText(eta)}</p>
            </div>
          </section>
        )}
      </div>

      {!alarm && (
        <p className="mt-4 px-1 text-base font-medium text-white/60">
          Con el tiempo real de Vitrasa: si el autobús se retrasa por el tráfico, el aviso se retrasa con él.
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2" aria-label="Estado del aviso">
        <ScreenStatus />
        <NotificationStatus status={notifications} />
        {lost && (
          <StatusRow icon={CircleAlert}>
            Ese autobús ya no aparece en los tiempos de Vitrasa: sigo con la última estimación.
          </StatusRow>
        )}
        {error && (
          <StatusRow icon={error.kind === 'offline' ? WifiOff : CircleAlert}>
            {error.kind === 'offline'
              ? 'Sin conexión: sigo con la última estimación y vuelvo a mirar en cuanto haya red.'
              : status === 'success'
                ? 'Vitrasa no responde: sigo con los últimos tiempos recibidos.'
                : 'Vitrasa no responde ahora mismo: sigo con la última estimación.'}
          </StatusRow>
        )}
      </ul>
    </FocusLayout>
  );
}
