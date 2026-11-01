import { Bell, CircleAlert, LocateFixed, LocateOff, WifiOff } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useStopArrivals } from '../../hooks/useStopArrivals';
import { useTrip } from '../../hooks/useTrip';
import { formatDistance, haversineMeters } from '../../lib/geo';
import { lineKey } from '../../lib/lines';
import { ALERT_MINUTES, minutesText } from '../../lib/tripTracker';
import { filterBusesByLines, filterReachingBuses } from '../../lib/directRoute';
import { lineColor, sortBuses } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import FocusPill from '../focus/FocusPill';
import { AlarmPanel, FocusDialog, FocusLayout, NotificationStatus, PANEL, ScreenStatus, StatusRow } from '../focus/FocusScreen';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';
import { t, useT } from '../../i18n';

// Llegadas a la parada de subida mientras se espera el autobús.
const ORIGIN_POLL_MS = 30_000;

// Autobuses de la subida que llegan al destino, igual que en la consulta
// rápida (`RouteResults`): sin variantes cortas ni sentido contrario.
function reachingBuses(buses, { plan, lines }) {
  const sorted = sortBuses(buses, [], 'time');
  return plan ? filterReachingBuses(sorted, plan).buses : filterBusesByLines(sorted, lines);
}

/** Texto de la píldora: lo que queda, según la fase. */
function pillText({ phase, busA, aEta, eta, progress }) {
  if (phase === 'riding') {
    if (eta != null) return eta < 0.5 ? t('trip.pill.arriving') : t('trip.pill.getOffIn', { time: minutesText(eta) });
    return progress ? t('trip.pill.left', { distance: formatDistance(progress.remainingMetres) }) : t('trip.riding');
  }
  if (busA && aEta != null) {
    return aEta < 0.5
      ? t('pill.lineArriving', { line: busA.line })
      : t('pill.lineIn', { line: busA.line, time: minutesText(aEta) });
  }
  return t('trip.pill.waiting');
}

/**
 * Modo viaje (`session.kind === 'trip'`, lo pinta `FocusHost`). El
 * seguimiento (`useTrip`: GPS, tiempos de la bajada y aviso) corre aquí,
 * fuera del diálogo, y también las llegadas a la subida mientras se espera
 * (antes las daba la consulta rápida): sigue aunque se cierre la consulta o
 * la pantalla negra se minimice a la píldora. `session.payload` = `{
 * boarding, destination, options, lines, plan, seed }` (`seed`: las llegadas
 * de la consulta al empezar); `live` a `false` mientras la pantalla sale.
 */
export default function TripSession({ session, live, onEnd, onMinimize, onRestore }) {
  const t = useT();
  const titleId = useId();
  const trip = session.payload;
  const [waiting, setWaiting] = useState(true);
  const arrivals = useStopArrivals(live && waiting ? trip.boarding.id : null, {
    refreshMs: ORIGIN_POLL_MS,
    background: true,
  });
  // Las llegadas más recientes: las de la consulta al empezar o las propias.
  const fresh = arrivals.status === 'success' && arrivals.updatedAt > (trip.seed?.updatedAt ?? 0);
  const updatedAt = fresh ? arrivals.updatedAt : trip.seed?.updatedAt;
  const arrivalBuses = fresh ? arrivals.buses : null;
  const buses = useMemo(
    () => (arrivalBuses ? reachingBuses(arrivalBuses, trip) : (trip.seed?.buses ?? [])),
    [arrivalBuses, trip],
  );

  const state = useTrip(trip, { originBuses: buses, originUpdatedAt: updatedAt, onEnd, live });
  // Ya en el autobús: la subida deja de pedirse (estado ajustado en render).
  if (waiting && state.phase !== 'waiting') setWaiting(false);
  const open = live && session.view === 'full';
  const alarmed = state.phase === 'alarm';

  // Con la píldora a la vista, el aviso vuelve solo a pantalla completa.
  useEffect(() => {
    if (live && alarmed && session.view === 'pill') onRestore();
  }, [live, alarmed, session.view, onRestore]);

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
        <TripView
          trip={trip}
          state={state}
          buses={buses}
          notifications={session.notifications}
          titleId={titleId}
          onEnd={onEnd}
        />
      </FocusDialog>
      <FocusPill
        visible={live && session.view === 'pill' && !alarmed}
        text={pillText(state)}
        label={t('trip.mode')}
        onRestore={onRestore}
      />
    </>
  );
}

function TripView({ trip, state, buses, notifications, titleId, onEnd }) {
  const t = useT();
  const { phase, alight, alarm } = state;
  const { destination } = trip;
  const walk =
    alight.id !== destination.id && [alight, destination].every((stop) => Number.isFinite(stop.lat))
      ? haversineMeters(alight, destination)
      : null;

  return (
    <FocusLayout icon={Bell} label={t('trip.mode')} endLabel={t('trip.end')} armed={phase !== 'alarm'}>
      <p className="text-lg font-medium text-white/60">{t('trip.getOffAt')}</p>
      <h2 id={titleId} className="text-pretty text-3xl font-bold tracking-tight">
        {alight.name}
      </h2>
      <p className="mt-1 text-base font-medium tabular-nums text-white/60">
        {`${t('stop.fallback', { id: alight.id })}${
          walk != null ? ` · ${t('trip.fromDestination', { distance: formatDistance(walk) })}` : ''
        }`}
      </p>

      <div className="mt-5">
        {phase === 'alarm' && <AlarmPanel title={t('trip.alert.title')} text={alarm.text} onDone={onEnd} />}
        {phase === 'riding' && <RidingPanel state={state} />}
        {phase === 'waiting' && <WaitingPanel state={state} trip={trip} buses={buses} />}
      </div>

      {phase !== 'alarm' && (
        <p className="mt-4 px-1 text-base font-medium text-white/60">
          {t('trip.explain', { n: ALERT_MINUTES })}
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2" aria-label={t('focus.status')}>
        <ScreenStatus />
        <NotificationStatus status={notifications} />
        <LocationStatus status={state.gpsStatus} />
        <DataStatus status={state.destStatus} error={state.destError} gpsStatus={state.gpsStatus} />
      </ul>
    </FocusLayout>
  );
}

function WaitingPanel({ state, trip, buses }) {
  const t = useT();
  const { busA, aEta, eta, selectedKey, select, board } = state;
  // Próximo autobús de cada línea directa, para elegir otro.
  const choices = [];
  const seen = new Set();
  for (const bus of buses) {
    const key = lineKey(bus.line);
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push(bus);
    if (choices.length === 4) break;
  }

  return (
    <section className={`${PANEL} p-5`} aria-label={t('trip.yourBus')}>
      <p className="text-base font-medium text-white/60">{t('trip.yourBus')}</p>
      {busA ? (
        <div className="mt-2 flex items-center gap-3">
          <LineBadge line={busA.line} color={lineColor(busA.line)} />
          <p className="min-w-0 flex-1 text-lg/snug font-medium text-white/80">
            {aEta < 0.5 ? (
              t('trip.busArriving', { stop: trip.boarding.name })
            ) : (
              <>
                {t('trip.busArrives', { stop: trip.boarding.name })}{' '}
                <span className="font-bold tabular-nums text-white">{minutesText(aEta)}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-lg font-medium text-white/80">
          {t('trip.noBuses', { stop: trip.boarding.name })}
        </p>
      )}
      {eta != null && busA && (
        <p className="mt-3 text-base font-medium tabular-nums text-white/60">
          {t('trip.wouldArrive', { time: minutesText(eta) })}
        </p>
      )}

      {choices.length > 1 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white/60">{t('trip.otherBus')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {choices.map((bus) => {
              const key = lineKey(bus.line);
              const selected = key === selectedKey;
              return (
                <button
                  key={bus.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => select(key)}
                  className={`flex h-11 items-center gap-2 rounded-full border px-3 text-base font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
                    selected ? 'border-white bg-white text-black' : 'border-white/15 bg-white/10 text-white'
                  }`}
                >
                  <span className="font-semibold">{bus.line}</span>
                  <span className={selected ? 'text-black/60' : 'text-white/60'}>{minutesText(bus.time)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <PillButton className="mt-5" onClick={board}>
        {t('trip.boarded')}
      </PillButton>
    </section>
  );
}

function RidingPanel({ state }) {
  const t = useT();
  const { eta, line, progress } = state;
  const details = [];
  if (progress?.stopsLeft != null) {
    details.push(t('direct.stops', { n: progress.stopsLeft }));
  }
  if (progress) details.push(formatDistance(progress.remainingMetres));

  return (
    <section className={`${PANEL} p-5`} aria-label={t('trip.riding')}>
      <p className="text-base font-medium text-white/60">{t('trip.reachIn')}</p>
      <p className="mt-1 text-6xl font-bold tabular-nums tracking-tight">
        {eta != null ? minutesText(eta) : '—'}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {line && <LineBadge line={line} color={lineColor(line)} />}
        <p className="text-base font-medium tabular-nums text-white/70">
          {details.length ? t('trip.left', { details: details.join(' · ') }) : t('trip.following')}
        </p>
      </div>
    </section>
  );
}

function LocationStatus({ status }) {
  const t = useT();
  switch (status) {
    case 'active':
      return <StatusRow ok icon={LocateFixed}>{t('trip.gps.active')}</StatusRow>;
    case 'locating':
      return <StatusRow ok icon={LocateFixed}>{t('trip.gps.locating')}</StatusRow>;
    case 'denied':
      return <StatusRow icon={LocateOff}>{t('trip.gps.denied')}</StatusRow>;
    case 'unavailable':
      return <StatusRow icon={LocateOff}>{t('trip.gps.unavailable')}</StatusRow>;
    case 'off':
      return null;
    default:
      return <StatusRow icon={LocateOff}>{t('trip.gps.unsupported')}</StatusRow>;
  }
}

function DataStatus({ status, error, gpsStatus }) {
  const t = useT();
  if (!error) return null;
  const gps = gpsStatus === 'active' || gpsStatus === 'locating';
  if (error.kind === 'offline') {
    return (
      <StatusRow icon={WifiOff}>
        {gps
          ? t('trip.data.offlineGps')
          : t('trip.data.offline')}
      </StatusRow>
    );
  }
  return (
    <StatusRow icon={CircleAlert}>
      {status === 'success'
        ? t('trip.data.stale')
        : gps
          ? t('trip.data.gps')
          : t('trip.data.retrying')}
    </StatusRow>
  );
}
