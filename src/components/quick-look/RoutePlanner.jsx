import { Plus } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { addRecentStop, clearRecentStops, useRecentStops } from '../../data/recentStops';
import { stopsNear } from '../../data/stops';
import { useNearestStop } from '../../hooks/useNearestStop';
import { useRouteIndex } from '../../hooks/useRouteIndex';
import { useStopArrivals } from '../../hooks/useStopArrivals';
import { useStopSearch } from '../../hooks/useStopSearch';
import { NEARBY_STOP_M, findDirectLines, mapsDirectionsUrl, planDirectRoute } from '../../lib/directRoute';
import { haversineMeters } from '../../lib/geo';
import { useOnlineStatus } from '../../lib/network';
import { toRouteCard, uniqueLines } from '../../services/vigobusAdapter';
import { DEFAULT_CARD_COLOR } from '../bus/cardColors';
import { PRESSABLE } from '../ui/pressable';
import MapsLink from './MapsLink';
import RouteFields from './RouteFields';
import RouteResults from './RouteResults';
import StopSuggestions, { CURRENT_LOCATION_ID } from './StopSuggestions';

// Origen por defecto: "Mi ubicación actual" (parada más cercana por GPS).
const LOCATION_ORIGIN = { source: 'location' };
const NO_ORIGIN = { source: 'manual', stop: null };
// Primera opción de la lista del origen: volver a "Mi ubicación actual".
const CURRENT_LOCATION = { id: CURRENT_LOCATION_ID };
const GEOLOCATION_SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator;

// Solo los datos de la parada (sin la posición ni la distancia del GPS).
function plainStop({ id, name, lines, lat, lon }) {
  return Number.isFinite(lat) && Number.isFinite(lon) ? { id, name, lines, lat, lon } : { id, name, lines };
}

// Candidatas de un extremo del trayecto: la parada elegida y las de alrededor.
const candidates = (stop) => [
  { stop, walk: 0 },
  ...stopsNear(stop, NEARBY_STOP_M, stop.id).map((near) => ({ stop: near, walk: near.distance })),
];

/**
 * Asistente de la consulta rápida: Origen (A) → Destino (B), todo en el
 * cliente y sin latencia.
 *
 * - A empieza como "Mi ubicación actual": el GPS la ancla a la parada más
 *   cercana (`useNearestStop`, Haversine). Sin permiso o sin señal, A queda
 *   vacío para escribirlo a mano.
 * - Solo A: sus llegadas, como siempre.
 * - A y B: con los recorridos del GTFS (`useRouteIndex`, `routes.json`) y el
 *   sentido de la marcha (`planDirectRoute`): solo valen las líneas que pasan
 *   por A y después por B (o por una parada a unos pasos de B; si desde A no
 *   sale ninguna, desde la de enfrente). Se piden los tiempos de la parada de
 *   subida (la misma llamada de siempre) y se enseñan solo los autobuses que
 *   llegan (sin variantes cortas). Sin línea directa no se llama a la API y
 *   se ofrece la ruta con transbordos en Google Maps. Si los recorridos no
 *   cargan, cruce plano de líneas con un aviso.
 *
 * Rendimiento: las búsquedas van con debounce de 200 ms y memorizadas
 * (`useStopSearch`), el cruce de líneas y el filtrado con `useMemo`, los
 * manejadores con `useCallback`, y los resultados (`RouteResults`, memorizado)
 * no se vuelven a pintar mientras se escribe.
 */
export default function RoutePlanner({ timeFormat, refreshMs, onAdd, scannedStop }) {
  const listId = useId();
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  const location = useNearestStop();
  // Recorridos del GTFS: se cargan al abrir el panel.
  const routeIndex = useRouteIndex();
  // Modo avión al instante (el Lie-Fi lo detectan las peticiones).
  const online = useOnlineStatus();
  const { locate, status: locationStatus, stop: locationStop, position, nearestMeters } = location;
  // Origen: la ubicación (GPS) o una parada elegida a mano (`stop: null` = vacío).
  const [originChoice, setOriginChoice] = useState(LOCATION_ORIGIN);
  const [destination, setDestination] = useState(null);
  // Parada leída con el escáner QR: pasa a ser el Origen (estado ajustado en
  // render, sin efectos; cada lectura es un objeto nuevo).
  const [appliedScan, setAppliedScan] = useState(null);
  if (scannedStop && scannedStop !== appliedScan) {
    setAppliedScan(scannedStop);
    setOriginChoice({ source: 'manual', stop: scannedStop });
    addRecentStop(scannedStop);
  }
  const usingLocation = originChoice.source === 'location';

  // Al abrir el panel se pide la ubicación ("Mi ubicación actual").
  useEffect(() => {
    locate();
  }, [locate]);

  const origin = useMemo(() => {
    if (!usingLocation) return originChoice.stop;
    return locationStop ? { ...locationStop, position } : null;
  }, [usingLocation, originChoice, locationStop, position]);

  // Campo que se está editando y su texto (solo se edita uno a la vez).
  const [activeField, setActiveField] = useState(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { suggestions, pending } = useStopSearch(activeField ? query : '');
  // Con el campo vacío: "Mi ubicación actual" (origen) y las recientes; en
  // cuanto se escribe, solo resultados (así Enter elige la que se busca).
  const recents = useRecentStops();
  const typing = query.trim() !== '';
  const offerLocation = activeField === 'origin' && GEOLOCATION_SUPPORTED && !typing;
  const showRecents = Boolean(activeField) && !typing && recents.length > 0;
  const options = useMemo(() => {
    const list = showRecents ? recents : suggestions;
    return offerLocation ? [CURRENT_LOCATION, ...list] : list;
  }, [offerLocation, showRecents, recents, suggestions]);
  const recentFrom = showRecents ? (offerLocation ? 1 : 0) : -1;
  // El origen enseña siempre su lista; el destino, en cuanto se escribe o si
  // hay recientes (con el campo vacío y sin historial siguen los tiempos).
  const showSuggestions =
    activeField === 'origin' || (activeField === 'destination' && (typing || showRecents));
  const highlighted = Math.min(activeIndex, options.length - 1);

  // --- Trayecto -----------------------------------------------------------
  const sameStop = Boolean(origin && destination && origin.id === destination.id);
  // Plan con sentido de la marcha: `undefined` mientras no se puede calcular,
  // `null` si A o B no están en los recorridos (no verificable).
  const plan = useMemo(() => {
    if (!origin || !destination || sameStop || routeIndex.status !== 'ready') return undefined;
    return planDirectRoute(routeIndex.index, { boarding: candidates(origin), alighting: candidates(destination) });
  }, [origin, destination, sameStop, routeIndex]);
  const verified = Boolean(plan);
  // Sin recorridos: el cruce plano de antes (sin sentido de la marcha).
  const flatLines = useMemo(
    () => (origin && destination && !verified ? findDirectLines(origin.lines, destination.lines) : []),
    [origin, destination, verified],
  );
  const directLines = useMemo(
    () => (verified ? plan.options.map((option) => option.line) : flatLines),
    [verified, plan, flatLines],
  );

  let mode;
  if (!origin) mode = 'no-origin';
  else if (!destination) mode = 'stop';
  else if (sameStop) mode = 'same';
  else if (routeIndex.status === 'loading') mode = 'checking';
  else if (directLines.length) mode = 'direct';
  else mode = 'no-direct';

  // Parada donde se sube: A o, si desde A no sale ninguna directa en ese
  // sentido, la de alrededor desde la que sí (normalmente la de enfrente).
  const boarding = mode === 'direct' && verified ? plan.boarding : origin;
  // A cuánto está del usuario, si el origen es su ubicación.
  const boardingDistance =
    usingLocation && origin?.position && boarding ? haversineMeters(origin.position, boarding) : null;

  // Solo se pide a Vitrasa cuando hay algo que enseñar: la parada sola o una
  // ruta directa. Misma parada, sin línea directa o comprobando: ninguna llamada.
  const fetchId = mode === 'stop' || mode === 'direct' ? boarding.id : null;
  const arrivals = useStopArrivals(fetchId, { refreshMs });
  const mapsUrl = useMemo(() => {
    if (!destination || mode === 'same') return null;
    // Desde el GPS, la posición exacta del usuario; si no, la parada.
    return mapsDirectionsUrl(origin ? (usingLocation ? origin.position : origin) : null, destination);
  }, [origin, destination, mode, usingLocation]);

  // --- Campos -------------------------------------------------------------
  const handleFocus = useCallback(
    (field) => {
      setActiveField(field);
      setActiveIndex(0);
      // Una parada elegida a mano se puede retocar (su texto queda seleccionado).
      const current = field === 'origin' ? (usingLocation ? null : originChoice.stop) : destination;
      setQuery(current?.name ?? '');
    },
    [usingLocation, originChoice, destination],
  );

  const handleBlur = useCallback((field) => {
    setActiveField((current) => (current === field ? null : current));
  }, []);

  const handleQueryChange = useCallback((text) => {
    setQuery(text);
    setActiveIndex(0);
  }, []);

  const choose = useCallback(
    (option) => {
      if (option.id === CURRENT_LOCATION_ID) {
        setOriginChoice(LOCATION_ORIGIN);
        locate();
      } else if (activeField === 'origin') {
        setOriginChoice({ source: 'manual', stop: option });
        addRecentStop(option);
      } else {
        setDestination(option);
        addRecentStop(option);
      }
      // Fuera el teclado: vuelven los resultados.
      (activeField === 'origin' ? originInputRef : destinationInputRef).current?.blur();
      setActiveField(null);
      setQuery('');
    },
    [activeField, locate],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        // Deja de editar sin cerrar el panel.
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.blur();
        return;
      }
      if (!showSuggestions || !options.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((highlighted + step + options.length) % options.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(options[highlighted]);
      }
    },
    [showSuggestions, options, highlighted, choose],
  );

  const handleClear = useCallback((field) => {
    if (field === 'origin') setOriginChoice(NO_ORIGIN);
    else setDestination(null);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const handleSwap = useCallback(() => {
    document.activeElement?.blur?.();
    setActiveField(null);
    setOriginChoice(destination ? { source: 'manual', stop: destination } : NO_ORIGIN);
    setDestination(origin ? plainStop(origin) : null);
  }, [origin, destination]);

  // Lo que enseña cada campo cuando no se está editando.
  const locating = usingLocation && (locationStatus === 'idle' || locationStatus === 'locating');
  const originView = useMemo(
    () => ({
      text: usingLocation ? (locating || locationStop ? 'Mi ubicación actual' : '') : (originChoice.stop?.name ?? ''),
      isLocation: usingLocation && (locating || Boolean(locationStop)),
      locating,
    }),
    [usingLocation, locating, locationStop, originChoice],
  );
  const destinationView = useMemo(() => ({ text: destination?.name ?? '' }), [destination]);

  // --- Pie: guardar la parada (o la ruta directa) o abrir Mapas -------------
  // Tarjeta de la parada de subida. Líneas: las directas (de menos a más
  // rodeo) o, con solo el origen, las de los datos abiertos (o, si no está en
  // ellos, las que llegan ahora).
  let addLines = [];
  if (mode === 'direct') addLines = directLines;
  else if (mode === 'stop') addLines = origin.lines?.length ? origin.lines : uniqueLines(arrivals.buses).map(({ line }) => line);
  const addRoute = () =>
    onAdd(
      toRouteCard({
        stop: plainStop(boarding),
        buses: arrivals.buses,
        lines: addLines,
        busesToShow: 3,
        color: DEFAULT_CARD_COLOR,
      }),
    );

  let hint = null;
  if (showSuggestions) {
    if (!typing) hint = showRecents ? null : 'Escribe una calle o el número de la marquesina.';
    else if (!pending && !suggestions.length) hint = 'No encuentro esa parada. Prueba con otra calle o con el número de la marquesina.';
  }

  return (
    <>
      <div className="shrink-0 px-5 pt-4">
        <RouteFields
          origin={originView}
          destination={destinationView}
          activeField={activeField}
          query={query}
          listId={listId}
          activeDescendant={showSuggestions && options.length ? `${listId}-${highlighted}` : undefined}
          expanded={showSuggestions && options.length > 0}
          originInputRef={originInputRef}
          destinationInputRef={destinationInputRef}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onQueryChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          onSwap={handleSwap}
        />
      </div>

      {/* Los cambios de los resultados se anuncian (no los de cada sugerencia). */}
      <div
        className="min-h-0 flex-1 transform-gpu overflow-y-auto overscroll-contain px-5 pb-2 pt-4"
        aria-live={showSuggestions ? 'off' : 'polite'}
      >
        {showSuggestions ? (
          <StopSuggestions
            id={listId}
            label={activeField === 'origin' ? 'Paradas de origen sugeridas' : 'Paradas de destino sugeridas'}
            options={options}
            activeIndex={highlighted}
            hint={hint}
            recentFrom={recentFrom}
            onClearRecents={clearRecentStops}
            onChoose={choose}
            onActivate={setActiveIndex}
          />
        ) : (
          <RouteResults
            mode={mode}
            origin={origin}
            destination={destination}
            boarding={boarding}
            boardingDistance={boardingDistance}
            plan={verified ? plan : null}
            directLines={directLines}
            arrivals={fetchId ? arrivals : null}
            usingLocation={usingLocation}
            locationStatus={locationStatus}
            nearestMeters={nearestMeters}
            mapsUrl={mapsUrl}
            timeFormat={timeFormat}
            online={online}
          />
        )}
      </div>

      {!showSuggestions && (mode === 'stop' || mode === 'direct' || mode === 'no-direct') && (
        <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
          {mode === 'no-direct' ? (
            <MapsLink href={mapsUrl} primary>
              Ver ruta con transbordos
            </MapsLink>
          ) : (
            // Botón secundario (cristal): guardar es opcional aquí. En una ruta
            // directa, la tarjeta guarda solo las líneas directas.
            <button
              type="button"
              disabled={!addLines.length}
              onClick={addRoute}
              className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${PRESSABLE}`}
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              Añadir a Mis Rutas
            </button>
          )}
        </div>
      )}
    </>
  );
}
