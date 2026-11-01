import { CircleAlert, DoorOpen, WifiOff } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useDeparture } from '../../hooks/useDeparture';
import { useLockScreenActivity } from '../../hooks/useLockScreenActivity';
import { whenLeft } from '../../lib/departure';
import { minutesText } from '../../lib/tripTracker';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import FocusPill from '../focus/FocusPill';
import { AlarmPanel, FocusDialog, FocusLayout, NotificationStatus, PANEL, ScreenStatus, StatusRow } from '../focus/FocusScreen';
import { useT } from '../../i18n';

/**
 * Modo salida (`session.kind === 'departure'`, lo pinta `FocusHost`). El
 * seguimiento (`useDeparture`: polling, cuenta atrás y aviso) corre aquí,
 * fuera del diálogo: sigue aunque la pantalla negra se minimice a la píldora.
 * `session.payload` = `{ stop, bus, fetchedAt, lead }`; `live` a `false`
 * mientras la pantalla sale tras terminar.
 */
export default function DepartureSession({ session, live, onEnd, onMinimize, onRestore }) {
  const t = useT();
  const titleId = useId();
  const departure = session.payload;
  const state = useDeparture(departure, { onEnd, live });
  const open = live && session.view === 'full';
  // Pantalla de bloqueo (Media Session): lo que queda y la línea y la parada.
  useLockScreenActivity(
    state.alarm
      ? t('departure.alert.title')
      : state.eta < 0.5
        ? t('lock.arriving')
        : t('lock.in', { time: minutesText(state.eta) }),
    `${state.line} · ${departure.stop.name}`,
    live,
  );

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
        text={
          state.eta < 0.5
            ? t('pill.lineArriving', { line: state.line })
            : t('pill.lineIn', { line: state.line, time: minutesText(state.eta) })
        }
        label={t('departure.mode')}
        onRestore={onRestore}
      />
    </>
  );
}

function DepartureView({ departure, state, notifications, titleId, onEnd }) {
  const t = useT();
  const { stop, lead } = departure;
  const { eta, line, destination, alarm, lost, status, error } = state;

  return (
    <FocusLayout icon={DoorOpen} label={t('departure.mode')} endLabel={t('departure.cancel')} armed={!alarm}>
      <h2 id={titleId} className="text-3xl font-bold tracking-tight">
        {t('departure.waiting', { line })}
      </h2>
      <p className="mt-1 text-pretty text-base font-medium text-white/60">
        {t('departure.where', { destination, stop: stop.name, id: stop.id })}
      </p>

      <div className="mt-5">
        {alarm ? (
          <AlarmPanel title={t('departure.alert.title')} text={alarm.text} onDone={onEnd} />
        ) : (
          <section className={`${PANEL} p-5`} aria-label={t('trip.yourBus')}>
            <p className="text-lg font-medium text-white/80">{t('departure.willAlert', { when: whenLeft(lead) })}</p>
            <p className="mt-4 text-base font-medium text-white/60">{t('departure.eta')}</p>
            <div className="mt-1 flex items-center gap-3">
              <LineBadge line={line} color={lineColor(line)} />
              <p className="text-6xl font-bold tabular-nums tracking-tight">{minutesText(eta)}</p>
            </div>
          </section>
        )}
      </div>

      {!alarm && (
        <p className="mt-4 px-1 text-base font-medium text-white/60">
          {t('departure.traffic')}
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2" aria-label={t('focus.status')}>
        <ScreenStatus />
        <NotificationStatus status={notifications} />
        {lost && (
          <StatusRow icon={CircleAlert}>
            {t('departure.lost')}
          </StatusRow>
        )}
        {error && (
          <StatusRow icon={error.kind === 'offline' ? WifiOff : CircleAlert}>
            {error.kind === 'offline'
              ? t('departure.offline')
              : status === 'success'
                ? t('departure.stale')
                : t('departure.estimate')}
          </StatusRow>
        )}
      </ul>
    </FocusLayout>
  );
}
