import { LoaderCircle, Route } from 'lucide-react';
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { loadStopsList, stopById } from '../../data/stops';
import { useRouteIndex } from '../../hooks/useRouteIndex';
import { useT } from '../../i18n';
import { findLineRoute } from '../../lib/lineTimeline';
import { lineColor } from '../../services/vigobusAdapter';
import Sheet from '../ui/Sheet';
import LineBadge from './LineBadge';

/**
 * Visor de línea: el recorrido de un autobús en vertical, al estilo de los
 * mapas de línea de Apple (sin mapa geográfico). Se abre al tocar un autobús
 * de una tarjeta o de la consulta rápida. `request` = `{ stopId, bus }`, o
 * `null` (cerrada). Solo datos locales: `routes.json` (qué recorrido y en qué
 * orden) y `stopsList.json` (nombres).
 */
export default function LineTimelineSheet({ request, onClose }) {
  const titleId = useId();
  // Se recuerda la última petición para seguir pintándola mientras la hoja sale.
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);

  return (
    <Sheet open={Boolean(request)} onClose={onClose} labelledBy={titleId}>
      {shown && <Timeline key={`${shown.stopId}-${shown.bus.id}`} request={shown} titleId={titleId} />}
    </Sheet>
  );
}

function useStopsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadStopsList().then(
      () => alive && setReady(true),
      () => alive && setReady(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

const Timeline = memo(function Timeline({ request, titleId }) {
  const t = useT();
  const { stopId, bus } = request;
  const { status, index } = useRouteIndex();
  const stopsReady = useStopsReady();
  const found = useMemo(
    () => (index ? findLineRoute(index, { line: bus.line, destination: bus.destination, stopId }) : null),
    [index, bus.line, bus.destination, stopId],
  );
  const color = bus.color ?? lineColor(bus.line);

  return (
    <>
      {/* Fija arriba (opaca) mientras la lista hace scroll; un velo corto
          difumina las paradas que pasan por debajo. */}
      <header className="sticky top-0 z-10 -mx-5 bg-graphite px-5 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <LineBadge line={bus.line} color={color} />
          <div className="min-w-0">
            <h2 id={titleId} className="text-2xl/tight font-bold tracking-tight">
              {t('timeline.title', { line: bus.line })}
            </h2>
            <p className="truncate text-base font-medium text-white/60">{t('timeline.toward', { head: bus.destination })}</p>
          </div>
        </div>
        {found && stopsReady && (
          <p className="mt-2 text-sm font-medium text-white/50">
            {t('timeline.stops', { n: found.route.stops.length })}
            {!found.verified && ` · ${t('timeline.approx')}`}
          </p>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-5 bg-gradient-to-b from-graphite to-graphite/0" />
      </header>

      {status === 'loading' || (found && !stopsReady) ? (
        <p className="mt-6 flex animate-fade-in items-center gap-2 text-base font-medium text-white/70 motion-reduce:animate-none">
          <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" strokeWidth={2.5} aria-hidden="true" />
          {t('timeline.loading')}
        </p>
      ) : !found ? (
        <p className="mt-6 flex animate-fade-in items-start gap-2 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
          <Route className="mt-0.5 h-5 w-5 shrink-0 text-white/50" strokeWidth={2.5} aria-hidden="true" />
          {t('timeline.notFound')}
        </p>
      ) : (
        <StopList stops={found.route.stops} active={found.position} color={color} />
      )}
    </>
  );
});

/** Lista vertical de paradas con la línea del color del autobús; la activa, centrada al abrir. */
const StopList = memo(function StopList({ stops, active, color }) {
  const t = useT();
  const activeRef = useRef(null);

  // Antes de pintar: la hoja ya entra con la parada activa en el centro.
  useLayoutEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, []);

  const last = stops.length - 1;
  return (
    <ol className="mt-2 animate-fade-in pb-4 motion-reduce:animate-none">
      {stops.map((id, i) => {
        const isActive = i === active;
        const passed = i < active;
        const name = stopById(id)?.name ?? t('stop.fallback', { id });
        return (
          <li
            key={`${id}-${i}`}
            ref={isActive ? activeRef : null}
            aria-current={isActive ? 'location' : undefined}
            className="relative flex min-h-[3.25rem] items-center gap-4"
          >
            {/* Columna de la línea: medio tramo arriba y medio abajo (se corta en los extremos). */}
            <span className="relative flex w-6 shrink-0 self-stretch items-center justify-center" aria-hidden="true">
              {i > 0 && <span className={`absolute left-1/2 top-0 h-1/2 w-1.5 -translate-x-1/2 ${color} ${i <= active ? 'opacity-40' : ''}`} />}
              {i < last && <span className={`absolute bottom-0 left-1/2 h-1/2 w-1.5 -translate-x-1/2 ${color} ${passed ? 'opacity-40' : ''}`} />}
              {isActive ? (
                <span className={`relative h-5 w-5 rounded-full ${color} shadow-relief ring-[3px] ring-white`} />
              ) : (
                <span className={`relative flex h-3 w-3 items-center justify-center rounded-full ${color} ${passed ? 'opacity-40' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-graphite" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 py-1.5">
              <span
                className={`block text-pretty text-base/snug ${
                  isActive ? 'text-lg font-bold text-white' : passed ? 'font-medium text-white/45' : 'font-medium text-white/85'
                }`}
              >
                {name}
              </span>
              <span className={`block text-sm font-medium tabular-nums ${isActive ? 'text-white/70' : 'text-white/40'}`}>
                {isActive ? `${t('timeline.here')} · ${t('stop.fallback', { id })}` : t('stop.fallback', { id })}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
});
