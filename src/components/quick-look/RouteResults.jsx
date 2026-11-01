import { CircleAlert, LoaderCircle, MapPinCheck, RouteOff, TriangleAlert, WifiOff } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { filterBusesByLines, filterReachingBuses } from '../../lib/directRoute';
import { formatDistance } from '../../lib/geo';
import { arrangeForNight } from '../../lib/nightMode';
import { useNightMode } from '../../hooks/useNightMode';
import { sortBuses } from '../../services/vigobusAdapter';
import BusLineItem from '../bus/BusLineItem';
import DayServiceEnded from '../bus/DayServiceEnded';
import TheoreticalArrivals from '../bus/TheoreticalArrivals';
import LineTimelineSheet from '../bus/LineTimelineSheet';
import DepartureAlarm from '../departure/DepartureAlarm';
import DepartureBell from '../departure/DepartureBell';
import IconTile from '../ui/IconTile';
import DirectLines from './DirectLines';
import MapsLink from './MapsLink';
import ShareRouteButton from './ShareRouteButton';
import WalkToStopButton from '../ui/WalkToStopButton';
import TripAlarm from '../trip/TripAlarm';
import { t, useT } from '../../i18n';

const BENTO = 'rounded-3xl border border-white/10 bg-white/[0.06]';

function errorMessage(error) {
  if (error?.kind === 'offline') return t('quick.error.offline');
  if (error?.kind === 'timeout') return t('quick.error.timeout');
  if (error?.kind === 'network') return t('error.network');
  if (error?.kind === 'not_found') return t('quick.error.notFound');
  return t('error.upstream');
}

// Por qué no hay origen cuando se quería usar el GPS.
function locationMessage(status, nearestMeters) {
  switch (status) {
    case 'denied':
      return t('quick.location.denied');
    case 'unavailable':
      return t('quick.location.unavailable');
    case 'unsupported':
      return t('quick.location.unsupported');
    case 'outside':
      return t('quick.location.outside', { distance: formatDistance(nearestMeters) });
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

/**
 * Parada de salida: nombre, número y, si sale del GPS, a cuánto está. Arriba
 * a la derecha, "cómo llegar andando" (`WalkToStopButton`) y, si hay,
 * `action` (compartir la ruta).
 */
function StopSummary({ stop, distance, action, children }) {
  const t = useT();
  return (
    <section aria-label={t('quick.departsFrom.label')} className={`relative ${BENTO} px-4 py-3 ${action ? 'pr-24' : 'pr-14'}`}>
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <WalkToStopButton stop={stop} />
        {action}
      </div>
      <p className="text-sm font-medium text-white/60">{t('quick.departsFrom')}</p>
      <p className="text-pretty text-lg/snug font-semibold">{stop.name}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-white/60">
        {`${t('stop.fallback', { id: stop.id })}${
          distance != null ? ` · ${t('quick.fromYou', { distance: formatDistance(distance) })}` : ''
        }`}
      </p>
      {children}
    </section>
  );
}

/** El error de la API y, si se puede, los horarios teóricos en su lugar. */
function ErrorOrSchedule({ stop, error, offline, offlineText, reach, timeFormat, onOpenLine }) {
  const message = offline ? (
    <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-white/80 motion-reduce:animate-none">
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-white/60" strokeWidth={2.5} aria-hidden="true" />
      {offlineText}
    </p>
  ) : (
    <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-red-200 motion-reduce:animate-none">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
      {errorMessage(error)}
    </p>
  );
  // Parada que Vitrasa no conoce: no hay horario que enseñar.
  if (error?.kind === 'not_found') return message;
  return (
    <TheoreticalArrivals
      stopId={stop.id}
      filter={reach}
      offline={offline}
      timeFormat={timeFormat}
      fallback={message}
      onOpenLine={onOpenLine}
    />
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
function Arrivals({ stop, lines, arrivals, buses, emptyText, offlineText, timeFormat, reach = null }) {
  const t = useT();
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
  // Autobús tocado: visor de línea (`{ stopId, bus }`).
  const [lineRequest, setLineRequest] = useState(null);
  return (
    <>
      <div className={`${BENTO} px-4 py-2`}>
        {arrivals.status === 'loading' && <Loading>{t('quick.loadingTimes')}</Loading>}
        {/* Sin tiempos (sin conexión o API caída): horario teórico del GTFS en
            gris; mientras carga (o si no hay horarios), el error de siempre. */}
        {arrivals.status === 'error' && (
          <ErrorOrSchedule
            stop={stop}
            error={arrivals.error}
            offline={offline}
            offlineText={offlineText}
            reach={reach}
            timeFormat={timeFormat}
            onOpenLine={setLineRequest}
          />
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
                  onOpen={() => setLineRequest({ stopId: stop.id, bus })}
                  action={
                    <DepartureBell bus={bus} onClick={() => setRequest({ stop, bus, fetchedAt: arrivals.updatedAt })} />
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="animate-fade-in py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
              {endedCount ? t('quick.nightOver') : emptyText}
            </p>
          ))}
        {arrivals.status === 'success' && arranged.ended && (
          <DayServiceEnded ended={arranged.ended} fetchedAt={arrivals.updatedAt} />
        )}
      </div>
      {arrivals.status === 'success' && arrivals.error && (
        <p className="animate-fade-in px-1 text-sm font-medium text-white/50 motion-reduce:animate-none">
          {offline
            ? t('quick.stale.offline')
            : t('quick.stale.error')}
        </p>
      )}
      <DepartureAlarm request={request} onClose={() => setRequest(null)} />
      <LineTimelineSheet request={lineRequest} onClose={() => setLineRequest(null)} />
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
  const t = useT();
  const { buses, hidden } = useMemo(() => {
    if (!arrivals) return { buses: [], hidden: 0 };
    const sorted = sortBuses(arrivals.buses, [], 'time');
    if (mode !== 'direct') return { buses: sorted, hidden: 0 };
    return plan ? filterReachingBuses(sorted, plan) : { buses: filterBusesByLines(sorted, directLines), hidden: 0 };
  }, [arrivals, mode, plan, directLines]);
  // Mismo filtro para los horarios teóricos (sin conexión): solo las que llegan.
  const reach = useCallback(
    (list) => {
      if (mode !== 'direct') return list;
      return plan ? filterReachingBuses(list, plan).buses : filterBusesByLines(list, directLines);
    },
    [mode, plan, directLines],
  );
  // Trayecto para el modo viaje ("Avisarme").
  const trip = useMemo(
    () =>
      mode === 'direct'
        ? { boarding, destination, options: plan?.options ?? [], lines: directLines, plan: plan ?? null }
        : null,
    [mode, boarding, destination, plan, directLines],
  );

  let content;
  if (mode === 'no-origin') {
    const message = usingLocation ? locationMessage(locationStatus, nearestMeters) : null;
    content = (
      <>
        {usingLocation && !message && (
          <div className={`${BENTO} px-4 py-1`}>
            <Loading>{t('nearby.locating')}</Loading>
          </div>
        )}
        {message && <Notice>{message}</Notice>}
        {!usingLocation && (
          <p className="px-1 text-base font-medium text-white/70">
            {t('quick.pickOrigin')}
          </p>
        )}
        {mapsUrl && <MapsLink href={mapsUrl}>{t('quick.maps')}</MapsLink>}
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
          emptyText={t('quick.noBuses')}
          offlineText={t('quick.error.offline')}
          reach={reach}
        />
      </>
    );
  } else if (mode === 'same') {
    content = (
      <EmptyState icon={MapPinCheck} title={t('quick.same.title')}>
        {t('quick.same.text', { stop: origin.name, id: origin.id })}
      </EmptyState>
    );
  } else if (mode === 'checking') {
    content = (
      <div className={`${BENTO} px-4 py-1`}>
        <Loading>{t('quick.checking')}</Loading>
      </div>
    );
  } else if (mode === 'no-direct') {
    const unknown = plan ? null : !origin.lines?.length ? origin : !destination.lines?.length ? destination : null;
    content = (
      <EmptyState icon={RouteOff} title={t('quick.noDirect.title')}>
        {unknown
          ? t('quick.noDirect.unknown', { stop: unknown.name })
          : t('quick.noDirect.text', { origin: origin.name, destination: destination.name })}
      </EmptyState>
    );
  } else {
    const switched = boarding.id !== origin.id;
    content = (
      <>
        {!plan && <Notice icon={TriangleAlert}>{t('quick.unverified')}</Notice>}
        <StopSummary
          stop={boarding}
          distance={boardingDistance}
          action={<ShareRouteButton origin={boarding} destination={destination} lines={directLines} />}
        >
          {switched && (
            <p className="mt-2 text-sm font-medium text-[#409CFF]">
              {t('quick.switched', { origin: origin.name, distance: formatDistance(plan.boardingWalk) })}
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
          emptyText={t('quick.noBuses.direct')}
          offlineText={t('quick.offline.direct')}
          reach={reach}
        />
        {hidden > 0 && (
          <p className="animate-fade-in px-1 text-sm font-medium text-white/50 motion-reduce:animate-none">
            {t('quick.hidden', { n: hidden })}
          </p>
        )}
        <TripAlarm trip={trip} buses={buses} updatedAt={arrivals.updatedAt} />
        <MapsLink href={mapsUrl}>{t('quick.maps')}</MapsLink>
      </>
    );
  }

  // `key`: al cambiar de estado, el bloque nuevo entra con un fundido.
  return (
    <div key={mode} className="flex animate-fade-in flex-col gap-3 motion-reduce:animate-none">
      {/* Modo avión: aviso fijo arriba. Las rutas directas siguen funcionando
          (recorridos del GTFS en el móvil); los tiempos no. */}
      {!online && (
        <Notice icon={WifiOff}>{t('quick.offlineBanner')}</Notice>
      )}
      {content}
    </div>
  );
}

export default memo(RouteResults);
