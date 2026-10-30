import { CircleAlert, LoaderCircle, MapPinCheck, RouteOff, TriangleAlert, WifiOff } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { filterBusesByLines, filterReachingBuses } from '../../lib/directRoute';
import { formatDistance } from '../../lib/geo';
import { arrangeForNight } from '../../lib/nightMode';
import { useNightMode } from '../../hooks/useNightMode';
import { sortBuses } from '../../services/vigobusAdapter';
import BusLineItem from '../bus/BusLineItem';
import DayServiceEnded from '../bus/DayServiceEnded';
import DepartureAlarm from '../departure/DepartureAlarm';
import DepartureBell from '../departure/DepartureBell';
import IconTile from '../ui/IconTile';
import DirectLines from './DirectLines';
import MapsLink from './MapsLink';
import ShareRouteButton from './ShareRouteButton';
import TripAlarm from '../trip/TripAlarm';

const BENTO = 'rounded-3xl border border-white/10 bg-white/[0.06]';

function errorMessage(error) {
  if (error?.kind === 'offline') return 'Sin conexión. No se pueden cargar los tiempos en directo.';
  if (error?.kind === 'timeout') return 'El servidor está arrancando. Los tiempos llegarán en unos segundos.';
  if (error?.kind === 'network') return 'No se puede conectar con el servidor de vBus.';
  if (error?.kind === 'not_found') return 'Vitrasa no reconoce esta parada.';
  return 'Vitrasa no responde ahora mismo. Inténtalo en un momento.';
}

// Por qué no hay origen cuando se quería usar el GPS.
function locationMessage(status, nearestMeters) {
  switch (status) {
    case 'denied':
      return 'Sin permiso para usar tu ubicación. Busca la parada de origen arriba (o actívalo en los ajustes del navegador).';
    case 'unavailable':
      return 'No se pudo saber dónde estás (sin señal o tardó demasiado). Busca la parada de origen arriba o vuelve a elegir "Mi ubicación actual".';
    case 'unsupported':
      return 'Este navegador no puede darte tu ubicación. Busca la parada de origen arriba.';
    case 'outside':
      return `Pareces estar fuera de Vigo: la parada de Vitrasa más cercana está a ${formatDistance(nearestMeters)}. Busca la parada de origen arriba.`;
    default:
      return null;
  }
}

/** Texto en gris con un indicador giratorio (cargas y búsquedas). */
function Loading({ children }) {
  return (
    <p className="flex animate-fade-in items-center gap-2 py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
      <LoaderCircle className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" strokeWidth={2.5} aria-hidden="true" />
      {children}
    </p>
  );
}

/** Aviso con icono (sin GPS, sentido sin verificar, errores de red…). */
function Notice({ tone = 'warning', icon: Icon = CircleAlert, children }) {
  return (
    <p
      className={`flex animate-fade-in items-start gap-2 ${BENTO} px-4 py-3 text-base font-medium motion-reduce:animate-none ${
        tone === 'error' ? 'text-red-200' : 'text-white/80'
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${tone === 'error' ? 'text-urgent' : 'text-amber-300'}`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

/** Estado vacío centrado: pastilla de icono, título y explicación. */
function EmptyState({ icon, title, children }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${BENTO} px-6 py-8 text-center`}>
      <IconTile icon={icon} strokeWidth={2.25} />
      <p className="text-xl font-semibold tracking-tight">{title}</p>
      <p className="text-pretty text-base font-medium text-white/70">{children}</p>
    </div>
  );
}

/** Parada de salida: nombre, número y, si sale del GPS, a cuánto está. `action`: botón arriba a la derecha. */
function StopSummary({ stop, distance, action, children }) {
  return (
    <section aria-label="Parada de salida" className={`relative ${BENTO} px-4 py-3 ${action ? 'pr-14' : ''}`}>
      {action && <div className="absolute right-3 top-3">{action}</div>}
      <p className="text-sm font-medium text-white/60">Sale de</p>
      <p className="text-pretty text-lg/snug font-semibold">{stop.name}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-white/60">
        {`Parada ${stop.id}${distance != null ? ` · a ${formatDistance(distance)} de ti` : ''}`}
      </p>
      {children}
    </section>
  );
}

/**
 * Llegadas de la parada de origen (ya filtradas si es una ruta directa), con
 * los mismos estados que las tarjetas: cargando, error, vacía y lista. Si un
 * refresco falla se conservan los últimos tiempos con un aviso. Cada autobús
 * lleva su campana: "avísame cuando le falten X min" (modo salida,
 * `DepartureAlarm`).
 *
 * De noche (Smart Night Mode, 23:00–06:00): las nocturnas con tiempo real
 * primero y las diurnas que ya terminaron (sin autobuses o a más de 2 h,
 * entre las de `lines`) al final, plegadas en "Servicio diurno finalizado".
 * Al cambiar de día a noche con la app abierta, la lista se recoloca con un
 * fundido.
 */
function Arrivals({ stop, lines, arrivals, buses, emptyText, offlineText, timeFormat }) {
  const offline = arrivals.error?.kind === 'offline';
  const night = useNightMode();
  const arranged = useMemo(
    () => (night ? arrangeForNight(buses, lines) : { buses, ended: null }),
    [night, buses, lines],
  );
  const shown = arranged.buses;
  const endedCount = arranged.ended ? arranged.ended.buses.length + arranged.ended.lines.length : 0;
  // Autobús cuya campana se ha tocado: `{ stop, bus, fetchedAt }`.
  const [request, setRequest] = useState(null);
  return (
    <>
      <div className={`${BENTO} px-4 py-2`}>
        {arrivals.status === 'loading' && <Loading>Cargando tiempos…</Loading>}
        {arrivals.status === 'error' && offline && (
          <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-white/80 motion-reduce:animate-none">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-white/60" strokeWidth={2.5} aria-hidden="true" />
            {offlineText}
          </p>
        )}
        {arrivals.status === 'error' && !offline && (
          <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-red-200 motion-reduce:animate-none">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
            {errorMessage(arrivals.error)}
          </p>
        )}
        {arrivals.status === 'success' &&
          (shown.length ? (
            // `key`: al pasar de día a noche (o al revés), la lista nueva entra con un fundido.
            <ul key={night ? 'night' : 'day'} className="animate-fade-in motion-reduce:animate-none">
              {shown.map((bus) => (
                <BusLineItem
                  key={bus.id}
                  {...bus}
                  timeFormat={timeFormat}
                  fetchedAt={arrivals.updatedAt}
                  action={
                    <DepartureBell bus={bus} onClick={() => setRequest({ stop, bus, fetchedAt: arrivals.updatedAt })} />
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="animate-fade-in py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
              {endedCount ? 'Esta noche ya no pasan más autobuses. Abajo, cuándo sale el primero de mañana.' : emptyText}
            </p>
          ))}
        {arrivals.status === 'success' && arranged.ended && (
          <DayServiceEnded ended={arranged.ended} fetchedAt={arrivals.updatedAt} />
        )}
      </div>
      {arrivals.status === 'success' && arrivals.error && (
        <p className="animate-fade-in px-1 text-sm font-medium text-white/50 motion-reduce:animate-none">
          {offline
            ? 'Sin conexión: son los últimos tiempos recibidos.'
            : 'No se pudieron actualizar: son los últimos tiempos recibidos.'}
        </p>
      )}
      <DepartureAlarm request={request} onClose={() => setRequest(null)} />
    </>
  );
}

/**
 * Resultados de la consulta rápida según el trayecto (`mode`, lo calcula
 * `RoutePlanner`):
 *
 * - `no-origin`: buscando la ubicación, por qué no hay GPS o qué falta.
 * - `stop` (solo origen): sus llegadas, como siempre.
 * - `same` (A = B): "Ya te encuentras en esta parada", sin pedir tiempos.
 * - `checking`: cargando los recorridos para comprobar el sentido.
 * - `no-direct`: "Sin línea directa", sin pedir tiempos (el enlace a Mapas va
 *   abajo como acción principal).
 * - `direct`: dónde subir y bajar, las líneas de menos a más rodeo y solo los
 *   autobuses que llegan (`plan`: sin variantes cortas ni sentido contrario).
 *   Sin `plan` (recorridos no disponibles), cruce plano de líneas con aviso.
 *   Debajo, "Avisarme" (modo viaje, `TripAlarm`) y, al final, Mapas.
 *
 * Memorizado: escribir en los campos no lo vuelve a pintar.
 */
function RouteResults({
  mode,
  origin,
  destination,
  boarding,
  boardingDistance,
  plan,
  directLines,
  arrivals,
  usingLocation,
  locationStatus,
  nearestMeters,
  mapsUrl,
  timeFormat,
  online = true,
}) {
  const { buses, hidden } = useMemo(() => {
    if (!arrivals) return { buses: [], hidden: 0 };
    const sorted = sortBuses(arrivals.buses, [], 'time');
    if (mode !== 'direct') return { buses: sorted, hidden: 0 };
    return plan ? filterReachingBuses(sorted, plan) : { buses: filterBusesByLines(sorted, directLines), hidden: 0 };
  }, [arrivals, mode, plan, directLines]);
  // Trayecto para el modo viaje ("Avisarme").
  const trip = useMemo(
    () => (mode === 'direct' ? { boarding, destination, options: plan?.options ?? [], lines: directLines } : null),
    [mode, boarding, destination, plan, directLines],
  );

  let content;
  if (mode === 'no-origin') {
    const message = usingLocation ? locationMessage(locationStatus, nearestMeters) : null;
    content = (
      <>
        {usingLocation && !message && (
          <div className={`${BENTO} px-4 py-1`}>
            <Loading>Buscando tu ubicación…</Loading>
          </div>
        )}
        {message && <Notice>{message}</Notice>}
        {!usingLocation && (
          <p className="px-1 text-base font-medium text-white/70">
            Elige la parada de origen: escribe una calle o el número de la marquesina.
          </p>
        )}
        {mapsUrl && <MapsLink href={mapsUrl}>Ver ruta en Mapas</MapsLink>}
      </>
    );
  } else if (mode === 'stop') {
    content = (
      <>
        <StopSummary stop={origin} distance={boardingDistance} />
        <Arrivals
          stop={origin}
          lines={origin.lines}
          arrivals={arrivals}
          buses={buses}
          timeFormat={timeFormat}
          emptyText="No hay autobuses previstos ahora mismo."
          offlineText="Sin conexión. No se pueden cargar los tiempos en directo."
        />
      </>
    );
  } else if (mode === 'same') {
    content = (
      <EmptyState icon={MapPinCheck} title="Ya te encuentras en esta parada">
        {`${origin.name} (parada ${origin.id}) es a la vez el origen y el destino.`}
      </EmptyState>
    );
  } else if (mode === 'checking') {
    content = (
      <div className={`${BENTO} px-4 py-1`}>
        <Loading>Comprobando el sentido de la marcha…</Loading>
      </div>
    );
  } else if (mode === 'no-direct') {
    const unknown = plan ? null : !origin.lines?.length ? origin : !destination.lines?.length ? destination : null;
    content = (
      <EmptyState icon={RouteOff} title="Sin línea directa">
        {unknown
          ? `No tenemos las líneas de ${unknown.name}: mira la ruta en Mapas.`
          : `Ninguna línea de Vitrasa va de ${origin.name} a ${destination.name} en ese sentido sin transbordo.`}
      </EmptyState>
    );
  } else {
    const switched = boarding.id !== origin.id;
    content = (
      <>
        {!plan && <Notice icon={TriangleAlert}>No se pudo verificar el sentido. Confirma en Mapas.</Notice>}
        <StopSummary
          stop={boarding}
          distance={boardingDistance}
          action={<ShareRouteButton origin={boarding} destination={destination} lines={directLines} />}
        >
          {switched && (
            <p className="mt-2 text-sm font-medium text-[#409CFF]">
              {`En ${origin.name} no pasa ninguna directa en tu sentido: sube en esta, a ${formatDistance(
                plan.boardingWalk,
              )}.`}
            </p>
          )}
          <DirectLines from={boarding} destination={destination} options={plan?.options ?? []} lines={directLines} />
        </StopSummary>
        <Arrivals
          stop={boarding}
          lines={directLines}
          arrivals={arrivals}
          buses={buses}
          timeFormat={timeFormat}
          emptyText="No hay autobuses próximos que lleguen hasta tu destino."
          offlineText="Líneas directas estáticas (Sin conexión a los tiempos de Vitrasa)."
        />
        {hidden > 0 && (
          <p className="animate-fade-in px-1 text-sm font-medium text-white/50 motion-reduce:animate-none">
            {hidden === 1
              ? 'Se oculta 1 autobús de estas líneas que no llega a tu destino (acaba antes o va en el otro sentido).'
              : `Se ocultan ${hidden} autobuses de estas líneas que no llegan a tu destino (acaban antes o van en el otro sentido).`}
          </p>
        )}
        <TripAlarm trip={trip} buses={buses} updatedAt={arrivals.updatedAt} />
        <MapsLink href={mapsUrl}>Ver ruta en Mapas</MapsLink>
      </>
    );
  }

  // `key`: al cambiar de estado, el bloque nuevo entra con un fundido.
  return (
    <div key={mode} className="flex animate-fade-in flex-col gap-3 motion-reduce:animate-none">
      {/* Modo avión: aviso fijo arriba. Las rutas directas siguen funcionando
          (recorridos del GTFS en el móvil); los tiempos no. */}
      {!online && (
        <Notice icon={WifiOff}>Sin conexión. Las líneas directas se calculan igual; los tiempos, al volver la red.</Notice>
      )}
      {content}
    </div>
  );
}

export default memo(RouteResults);
