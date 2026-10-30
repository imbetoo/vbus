import { Bell, CircleAlert, LocateFixed, LocateOff, WifiOff } from 'lucide-react';
import { useId, useState } from 'react';
import { useTrip } from '../../hooks/useTrip';
import { formatDistance, haversineMeters } from '../../lib/geo';
import { lineKey } from '../../lib/lines';
import { ALERT_MINUTES, minutesText } from '../../lib/tripTracker';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import { AlarmPanel, FocusDialog, FocusLayout, NotificationStatus, PANEL, ScreenStatus, StatusRow } from '../focus/FocusScreen';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';

/**
 * Modo viaje a pantalla completa (`FocusDialog`: negro puro, la pantalla se
 * queda encendida todo el viaje).
 */
export default function TripSheet({ trip, buses, updatedAt, notifications, onEnd }) {
  const titleId = useId();
  // El último trayecto sigue pintado mientras la pantalla sale.
  const [shown, setShown] = useState(trip);
  if (trip && trip !== shown) setShown(trip);

  return (
    <FocusDialog open={Boolean(trip)} onEnd={onEnd} labelledBy={titleId}>
      {shown && (
        <TripView
          key={shown.boarding.id}
          trip={shown}
          buses={buses}
          updatedAt={updatedAt}
          notifications={notifications}
          titleId={titleId}
          onEnd={onEnd}
        />
      )}
    </FocusDialog>
  );
}

function TripView({ trip, buses, updatedAt, notifications, titleId, onEnd }) {
  const state = useTrip(trip, { originBuses: buses, originUpdatedAt: updatedAt, onEnd });
  const { phase, alight, alarm } = state;
  const { destination } = trip;
  const walk =
    alight.id !== destination.id && [alight, destination].every((stop) => Number.isFinite(stop.lat))
      ? haversineMeters(alight, destination)
      : null;

  return (
    <FocusLayout icon={Bell} label="Modo viaje" endLabel="Terminar viaje" armed={phase !== 'alarm'}>
      <p className="text-lg font-medium text-white/60">Bájate en</p>
      <h2 id={titleId} className="text-pretty text-3xl font-bold tracking-tight">
        {alight.name}
      </h2>
      <p className="mt-1 text-base font-medium tabular-nums text-white/60">
        {`Parada ${alight.id}${walk != null ? ` · a ${formatDistance(walk)} de tu destino` : ''}`}
      </p>

      <div className="mt-5">
        {phase === 'alarm' && <AlarmPanel title="Prepárate para bajar" text={alarm.text} onDone={onEnd} />}
        {phase === 'riding' && <RidingPanel state={state} />}
        {phase === 'waiting' && <WaitingPanel state={state} trip={trip} buses={buses} />}
      </div>

      {phase !== 'alarm' && (
        <p className="mt-4 px-1 text-base font-medium text-white/60">
          {`Te aviso unos ${ALERT_MINUTES} min antes de llegar, con el tiempo real de Vitrasa (incluye el tráfico) y tu GPS.`}
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-2" aria-label="Estado del aviso">
        <ScreenStatus />
        <NotificationStatus status={notifications} />
        <LocationStatus status={state.gpsStatus} />
        <DataStatus status={state.destStatus} error={state.destError} gpsStatus={state.gpsStatus} />
      </ul>
    </FocusLayout>
  );
}

function WaitingPanel({ state, trip, buses }) {
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
    <section className={`${PANEL} p-5`} aria-label="Tu autobús">
      <p className="text-base font-medium text-white/60">Tu autobús</p>
      {busA ? (
        <div className="mt-2 flex items-center gap-3">
          <LineBadge line={busA.line} color={lineColor(busA.line)} />
          <p className="min-w-0 flex-1 text-lg/snug font-medium text-white/80">
            {aEta < 0.5 ? (
              <>Llegando a {trip.boarding.name}</>
            ) : (
              <>
                Llega a {trip.boarding.name} en{' '}
                <span className="font-bold tabular-nums text-white">{minutesText(aEta)}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-lg font-medium text-white/80">
          {`No hay autobuses directos previstos ahora en ${trip.boarding.name}. Si ya vas en uno, tócalo abajo.`}
        </p>
      )}
      {eta != null && busA && (
        <p className="mt-3 text-base font-medium tabular-nums text-white/60">
          {`Llegarías a tu parada en unos ${minutesText(eta)}.`}
        </p>
      )}

      {choices.length > 1 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white/60">¿Vas a coger otro?</p>
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
        Ya voy en el autobús
      </PillButton>
    </section>
  );
}

function RidingPanel({ state }) {
  const { eta, line, progress } = state;
  const details = [];
  if (progress?.stopsLeft != null) {
    details.push(`${progress.stopsLeft} ${progress.stopsLeft === 1 ? 'parada' : 'paradas'}`);
  }
  if (progress) details.push(formatDistance(progress.remainingMetres));

  return (
    <section className={`${PANEL} p-5`} aria-label="En camino">
      <p className="text-base font-medium text-white/60">Llegas a tu parada en</p>
      <p className="mt-1 text-6xl font-bold tabular-nums tracking-tight">
        {eta != null ? minutesText(eta) : '—'}
      </p>
      <div className="mt-3 flex items-center gap-3">
        {line && <LineBadge line={line} color={lineColor(line)} />}
        <p className="text-base font-medium tabular-nums text-white/70">
          {details.length ? `Quedan ${details.join(' · ')}` : 'Siguiendo tu autobús…'}
        </p>
      </div>
    </section>
  );
}

function LocationStatus({ status }) {
  switch (status) {
    case 'active':
      return <StatusRow ok icon={LocateFixed}>Siguiendo tu posición en el recorrido.</StatusRow>;
    case 'locating':
      return <StatusRow ok icon={LocateFixed}>Buscando tu posición…</StatusRow>;
    case 'denied':
      return <StatusRow icon={LocateOff}>Sin permiso de ubicación: me guío solo por los tiempos de Vitrasa.</StatusRow>;
    case 'unavailable':
      return <StatusRow icon={LocateOff}>Sin señal GPS ahora mismo: me guío por los tiempos de Vitrasa.</StatusRow>;
    case 'off':
      return null;
    default:
      return <StatusRow icon={LocateOff}>Este navegador no da tu ubicación: me guío por los tiempos de Vitrasa.</StatusRow>;
  }
}

function DataStatus({ status, error, gpsStatus }) {
  if (!error) return null;
  const gps = gpsStatus === 'active' || gpsStatus === 'locating';
  if (error.kind === 'offline') {
    return (
      <StatusRow icon={WifiOff}>
        {gps
          ? 'Sin conexión: te aviso por GPS hasta que vuelva la red.'
          : 'Sin conexión ni GPS: ahora mismo no puedo seguir tu autobús.'}
      </StatusRow>
    );
  }
  return (
    <StatusRow icon={CircleAlert}>
      {status === 'success'
        ? 'Vitrasa no responde: uso los últimos tiempos recibidos.'
        : gps
          ? 'Vitrasa no responde: te aviso por GPS mientras tanto.'
          : 'Vitrasa no responde ahora mismo: lo sigo intentando.'}
    </StatusRow>
  );
}
