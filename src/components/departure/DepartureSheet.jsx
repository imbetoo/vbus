import { CircleAlert, DoorOpen, WifiOff } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useDeparture } from '../../hooks/useDeparture';
import { whenLeft } from '../../lib/departure';
import { minutesText } from '../../lib/tripTracker';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import FocusPill from '../focus/FocusPill';
import { AlarmPanel, FocusDialog, FocusLayout, NotificationStatus, PANEL, ScreenStatus, StatusRow } from '../focus/FocusScreen';

/**
 * Modo salida (`session.kind === 'departure'`, lo pinta `FocusHost`). El
 * seguimiento (`useDeparture`: polling, cuenta atrás y aviso) corre aquí,
 * fuera del diálogo: sigue aunque la pantalla negra se minimice a la píldora.
 * `session.payload` = `{ stop, bus, fetchedAt, lead }`; `live` a `false`
 * mientras la pantalla sale tras terminar.
 */
export default function DepartureSession({ session, live, onEnd, onMinimize, onRestore }) {
  const titleId = useId();
  const departure = session.payload;
  const state = useDeparture(departure, { onEnd, live });
  const open = live && session.view === 'full';

  // Con la píldora a la vista, el aviso vuelve solo a pantalla completa.
  useEffect(() => {
    if (live && state.alarm && session.view === 'pill') onRestore();
  }, [live, state.alarm, session.view, onRestore]);

  return (
    <>
      <FocusDialog
        open={open}
        active={live}
        onEnd={onEnd}
        onMinimize={onMinimize}
        onRestore={onRestore}
        labelledBy={titleId}
      >
        <DepartureView departure={departure} state={state} notifications={session.notifications} titleId={titleId} onEnd={onEnd} />
      </FocusDialog>
      <FocusPill
        visible={live && session.view === 'pill' && !state.alarm}
        text={`${state.line} ${state.eta < 0.5 ? 'llegando' : `en ${minutesText(state.eta)}`}`}
        label="Modo salida"
        onRestore={onRestore}
      />
    </>
  );
}

function DepartureView({ departure, state, notifications, titleId, onEnd }) {
  const { stop, lead } = departure;
  const { eta, line, destination, alarm, lost, status, error } = state;

  return (
    <FocusLayout icon={DoorOpen} label="Modo salida" endLabel="Cancelar aviso" armed={!alarm}>
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
