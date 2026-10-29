import { CircleAlert, LoaderCircle, MapPinCheck, RouteOff } from 'lucide-react';
import { memo, useMemo } from 'react';
import { filterBusesByLines, formatLines } from '../../lib/directRoute';
import { formatDistance } from '../../lib/geo';
import { lineColor, sortBuses } from '../../services/vigobusAdapter';
import BusLineItem from '../bus/BusLineItem';
import LineBadge from '../bus/LineBadge';
import IconTile from '../ui/IconTile';
import MapsLink from './MapsLink';

const BENTO = 'rounded-3xl border border-white/10 bg-white/[0.06]';

function errorMessage(error) {
  if (error?.kind === 'timeout') return 'El servidor está arrancando. Los tiempos llegarán en unos segundos.';
  if (error?.kind === 'network') return 'No se puede conectar con el servidor de VigoBus.';
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

/** Aviso con icono (sin GPS, errores de red…). */
function Notice({ tone = 'warning', children }) {
  return (
    <p
      className={`flex animate-fade-in items-start gap-2 ${BENTO} px-4 py-3 text-base font-medium motion-reduce:animate-none ${
        tone === 'error' ? 'text-red-200' : 'text-white/80'
      }`}
    >
      <CircleAlert
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

/** Parada de salida: nombre, número y, si sale del GPS, a cuánto está. */
function StopSummary({ stop, distance, children }) {
  return (
    <section aria-label="Parada de salida" className={`${BENTO} px-4 py-3`}>
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
 * refresco falla se conservan los últimos tiempos con un aviso.
 */
function Arrivals({ arrivals, buses, emptyText, timeFormat }) {
  return (
    <>
      <div className={`${BENTO} px-4 py-2`}>
        {arrivals.status === 'loading' && <Loading>Cargando tiempos…</Loading>}
        {arrivals.status === 'error' && (
          <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-red-200 motion-reduce:animate-none">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
            {errorMessage(arrivals.error)}
          </p>
        )}
        {arrivals.status === 'success' &&
          (buses.length ? (
            <ul className="animate-fade-in motion-reduce:animate-none">
              {buses.map((bus) => (
                <BusLineItem key={bus.id} {...bus} timeFormat={timeFormat} fetchedAt={arrivals.updatedAt} />
              ))}
            </ul>
          ) : (
            <p className="animate-fade-in py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
              {emptyText}
            </p>
          ))}
      </div>
      {arrivals.status === 'success' && arrivals.error && (
        <p className="animate-fade-in px-1 text-sm font-medium text-white/50 motion-reduce:animate-none">
          No se pudieron actualizar: son los últimos tiempos recibidos.
        </p>
      )}
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
 * - `no-direct`: "Sin línea directa", sin pedir tiempos (el enlace a Mapas va
 *   abajo como acción principal).
 * - `direct`: las líneas directas y solo sus llegadas; al final, Mapas.
 *
 * Memorizado: escribir en los campos no lo vuelve a pintar.
 */
function RouteResults({
  mode,
  origin,
  destination,
  directLines,
  arrivals,
  usingLocation,
  locationStatus,
  nearestMeters,
  mapsUrl,
  timeFormat,
}) {
  const buses = useMemo(() => {
    if (!arrivals) return [];
    const sorted = sortBuses(arrivals.buses, [], 'time');
    return mode === 'direct' ? filterBusesByLines(sorted, directLines) : sorted;
  }, [arrivals, mode, directLines]);
  const distance = usingLocation ? origin?.distance : null;

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
        <StopSummary stop={origin} distance={distance} />
        <Arrivals arrivals={arrivals} buses={buses} timeFormat={timeFormat} emptyText="No hay autobuses previstos ahora mismo." />
      </>
    );
  } else if (mode === 'same') {
    content = (
      <EmptyState icon={MapPinCheck} title="Ya te encuentras en esta parada">
        {`${origin.name} (parada ${origin.id}) es a la vez el origen y el destino.`}
      </EmptyState>
    );
  } else if (mode === 'no-direct') {
    const unknown = !origin.lines?.length ? origin : !destination.lines?.length ? destination : null;
    content = (
      <EmptyState icon={RouteOff} title="Sin línea directa">
        {unknown
          ? `No tenemos las líneas de ${unknown.name}: mira la ruta en Mapas.`
          : `Ninguna línea de Vitrasa va de ${origin.name} a ${destination.name} sin transbordo.`}
      </EmptyState>
    );
  } else {
    content = (
      <>
        <StopSummary stop={origin} distance={distance}>
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-sm font-medium text-white/60">
              {`${directLines.length === 1 ? 'Línea directa' : 'Líneas directas'} a ${destination.name}`}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {directLines.map((line) => (
                <LineBadge as="li" key={line} line={line} color={lineColor(line)} />
              ))}
            </ul>
          </div>
        </StopSummary>
        <Arrivals
          arrivals={arrivals}
          buses={buses}
          timeFormat={timeFormat}
          emptyText={`Hay conexión directa (${formatLines(directLines)}), pero no hay autobuses próximos.`}
        />
        <MapsLink href={mapsUrl}>Ver ruta en Mapas</MapsLink>
      </>
    );
  }

  // `key`: al cambiar de estado, el bloque nuevo entra con un fundido.
  return (
    <div key={mode} className="flex animate-fade-in flex-col gap-3 motion-reduce:animate-none">
      {content}
    </div>
  );
}

export default memo(RouteResults);
