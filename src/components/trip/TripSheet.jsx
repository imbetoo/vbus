import { Bell, BellOff, BellRing, CircleAlert, LocateFixed, LocateOff, Smartphone, WifiOff, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';
import { useTrip } from '../../hooks/useTrip';
import { formatDistance, haversineMeters } from '../../lib/geo';
import { lineKey } from '../../lib/lines';
import { ALERT_MINUTES } from '../../lib/tripTracker';
import { useWakeLockStatus } from '../../lib/wakeLock';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import IconButton from '../ui/IconButton';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';

const EXIT_MS = 300;
const PANEL = 'rounded-3xl border border-white/10 bg-white/[0.06]';

// "Llegando", "1 min", "12 min".
const minutesText = (minutes) => (minutes < 0.5 ? 'Llegando' : `${Math.round(minutes)} min`);

/**
 * Modo viaje a pantalla completa (`<dialog>` modal, fundido). Fondo negro
 * puro: en pantallas OLED los píxeles negros no gastan batería, y la pantalla
 * se queda encendida todo el viaje (`keepScreenOn`).
 */
export default function TripSheet({ trip, buses, updatedAt, notifications, onEnd }) {
  const ref = useRef(null);
  const titleId = useId();
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open: Boolean(trip), onClose: onEnd, exitMs: EXIT_MS });
  // El último trayecto sigue pintado mientras la pantalla sale.
  const [shown, setShown] = useState(trip);
  if (trip && trip !== shown) setShown(trip);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...dialogProps}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-black p-0 text-white opacity-0 transform-gpu transition-opacity duration-300 ease-spring will-change-[opacity] backdrop:bg-black data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      {mounted && shown && (
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
    </dialog>
  );
}

function TripView({ trip, buses, updatedAt, notifications, titleId, onEnd }) {
  const state = useTrip(trip, { originBuses: buses, originUpdatedAt: updatedAt, onEnd });
  const wakeLock = useWakeLockStatus();
  const { phase, alight, alarm } = state;
  const { destination } = trip;
  const walk =
    alight.id !== destination.id && [alight, destination].every((stop) => Number.isFinite(stop.lat))
      ? haversineMeters(alight, destination)
      : null;

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-white/70">
          <Bell className="h-5 w-5 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
          Modo viaje
        </p>
        <IconButton icon={X} label="Terminar viaje" onClick={onEnd} />
      </header>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
        <p className="text-lg font-medium text-white/60">Bájate en</p>
        <h2 id={titleId} className="text-pretty text-3xl font-bold tracking-tight">
          {alight.name}
        </h2>
        <p className="mt-1 text-base font-medium tabular-nums text-white/60">
          {`Parada ${alight.id}${walk != null ? ` · a ${formatDistance(walk)} de tu destino` : ''}`}
        </p>

        <div className="mt-5">
          {phase === 'alarm' && <AlarmPanel text={alarm.text} onDone={onEnd} />}
          {phase === 'riding' && <RidingPanel state={state} />}
          {phase === 'waiting' && <WaitingPanel state={state} trip={trip} buses={buses} />}
        </div>

        {phase !== 'alarm' && (
          <p className="mt-4 px-1 text-base font-medium text-white/60">
            {`Te aviso unos ${ALERT_MINUTES} min antes de llegar, con el tiempo real de Vitrasa (incluye el tráfico) y tu GPS.`}
          </p>
        )}

        <ul className="mt-5 flex flex-col gap-2" aria-label="Estado del aviso">
          <ScreenStatus status={wakeLock} />
          <NotificationStatus status={notifications} />
          <LocationStatus status={state.gpsStatus} />
          <DataStatus status={state.destStatus} error={state.destError} gpsStatus={state.gpsStatus} />
        </ul>
      </div>

      {phase !== 'alarm' && (
        <p className="shrink-0 pt-3 text-center text-sm font-medium text-white/50">
          Mantén vBus abierta: si cambias de app o bloqueas el móvil, el aviso puede no llegar.
        </p>
      )}
    </div>
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
        {eta != null ? (eta < 0.5 ? 'Llegando' : `${Math.round(eta)} min`) : '—'}
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

function AlarmPanel({ text, onDone }) {
  return (
    <section
      role="alert"
      className="flex animate-fade-in flex-col items-center rounded-3xl border-2 border-amber-300/70 bg-amber-300/15 px-5 py-8 text-center motion-reduce:animate-none"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-300 text-black shadow-relief">
        <BellRing className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <p className="mt-4 text-3xl font-bold tracking-tight">Prepárate para bajar</p>
      <p className="mt-2 text-pretty text-lg font-medium text-white/80">{text}</p>
      <PillButton className="mt-6" onClick={onDone}>
        Entendido
      </PillButton>
    </section>
  );
}

/** Fila de estado: verde si todo va bien, ámbar si falta algo (con el porqué). */
function StatusRow({ ok, icon: Icon, children }) {
  return (
    <li className={`flex items-start gap-3 ${PANEL} px-4 py-3 text-sm font-medium text-white/80`}>
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? 'text-emerald-400' : 'text-amber-300'}`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

function ScreenStatus({ status }) {
  if (status === 'on') return <StatusRow ok icon={Smartphone}>La pantalla no se apagará durante el viaje.</StatusRow>;
  if (status === 'pending' || status === 'off') {
    return <StatusRow ok icon={Smartphone}>Manteniendo la pantalla encendida…</StatusRow>;
  }
  return (
    <StatusRow icon={Smartphone}>
      Este navegador no puede mantener la pantalla encendida: tócala de vez en cuando para que no se bloquee.
    </StatusRow>
  );
}

function NotificationStatus({ status }) {
  switch (status) {
    case 'granted':
      return <StatusRow ok icon={Bell}>Notificaciones activadas.</StatusRow>;
    case 'default':
      return <StatusRow icon={Bell}>Permite las notificaciones para que el aviso llegue también como notificación.</StatusRow>;
    case 'denied':
      return (
        <StatusRow icon={BellOff}>
          Notificaciones bloqueadas: te aviso aquí con sonido y vibración. Puedes activarlas en los ajustes del navegador.
        </StatusRow>
      );
    case 'ios-install':
      return (
        <StatusRow icon={BellOff}>
          En iPhone, las notificaciones solo funcionan con vBus en la pantalla de inicio (Compartir → Añadir a pantalla de
          inicio). Te aviso aquí con sonido.
        </StatusRow>
      );
    default:
      return <StatusRow icon={BellOff}>Este navegador no muestra notificaciones: te aviso aquí con sonido y vibración.</StatusRow>;
  }
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
