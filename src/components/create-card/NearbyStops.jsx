import { CircleAlert, LoaderCircle, LocateFixed } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { loadStopsList, nearestStops } from '../../data/stops';
import { OUTSIDE_VIGO_M, formatDistance, getCurrentPosition, locationErrorStatus } from '../../lib/geo';
import { PRESSABLE } from '../ui/pressable';
import StopRow from './StopRow';
import { t, useT } from '../../i18n';

// Radio en el que se buscan paradas "cerca de mí" y número de resultados.
const RADIUS_M = 800;
const LIMIT = 5;

// Mensaje para cada estado que no son resultados.
function statusMessage(state) {
  switch (state.status) {
    case 'unsupported':
      return t('nearby.unsupported');
    case 'denied':
      return t('nearby.denied');
    case 'unavailable':
      return t('nearby.unavailable');
    case 'outside':
      return t('nearby.outside', { distance: formatDistance(state.nearestMeters) });
    default:
      return null;
  }
}

/**
 * "Paradas cerca de mí" (hoja "Nueva tarjeta"): pide la ubicación del GPS
 * (`navigator.geolocation`), calcula con Haversine la distancia a las 1157
 * paradas y enseña las 5 más cercanas a menos de 800 m (o las 5 más próximas
 * si no hay ninguna tan cerca), con su distancia. Al elegir una, `onSelect`.
 *
 * Estados: buscando ubicación, permiso denegado, sin señal, navegador sin GPS
 * y fuera de Vigo. La ubicación no se guarda en ningún sitio.
 */
export default function NearbyStops({ onSelect }) {
  const t = useT();
  const [state, setState] = useState({ status: 'idle' });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const search = async () => {
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'locating' });
    try {
      const [position] = await Promise.all([getCurrentPosition(), loadStopsList()]);
      if (!alive.current) return;
      const result = nearestStops(position, { limit: LIMIT, maxMeters: RADIUS_M });
      setState(
        result.nearestMeters > OUTSIDE_VIGO_M
          ? { status: 'outside', nearestMeters: result.nearestMeters }
          : { status: 'done', ...result },
      );
    } catch (error) {
      if (!alive.current) return;
      setState({ status: locationErrorStatus(error) });
    }
  };

  const locating = state.status === 'locating';
  const message = statusMessage(state);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={search}
        disabled={locating}
        aria-busy={locating}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 text-base font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-70 ${PRESSABLE}`}
      >
        {locating ? (
          <LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <LocateFixed className="h-5 w-5 text-accent" strokeWidth={2.5} aria-hidden="true" />
        )}
        {t(locating ? 'nearby.locating' : 'nearby.button')}
      </button>

      <div aria-live="polite">
        {message && (
          <p
            key={state.status}
            className="mt-3 flex animate-fade-in items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm font-medium text-white/80 motion-reduce:animate-none"
          >
            <CircleAlert className="mt-px h-4 w-4 shrink-0 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
            {message}
          </p>
        )}

        {state.status === 'done' && (
          <div key="results" className="animate-fade-in motion-reduce:animate-none">
            <p className="mb-2 mt-3 text-sm font-medium text-white/60">
              {state.withinRadius
                ? t('nearby.within', { m: RADIUS_M })
                : t('nearby.closest', { m: RADIUS_M })}
            </p>
            <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
              {state.stops.map((stop) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setState({ status: 'idle' });
                      onSelect(stop);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-150 active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    <StopRow stop={stop} distance={formatDistance(stop.distance)} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
