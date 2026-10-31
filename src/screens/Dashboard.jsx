import { AnimatePresence, Reorder, motion } from 'framer-motion';
import { BusFront, Check, Moon, Pencil, Search, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { forcedScheme } from '../lib/appearance';
import { useT } from '../i18n';
import { haptics } from '../lib/haptics';
import { isOnboarded, isStandalone, markOnboarded } from '../lib/platform';
import { prefersReducedMotion } from '../lib/motion';
import { withNearestFirst } from '../lib/proximity';
import EditCardModal from '../components/bus/EditCardModal';
import EditableRouteItem from '../components/bus/EditableRouteItem';
import CreateCardButton from '../components/create-card/CreateCardButton';
import CreateCardSheet from '../components/create-card/CreateCardSheet';
import DepartureAlarm from '../components/departure/DepartureAlarm';
import QuickLookSheet from '../components/quick-look/QuickLookSheet';
import Clock from '../components/settings/Clock';
import SettingsModal from '../components/settings/SettingsModal';
import ThemeToggle from '../components/settings/ThemeToggle';
import IconButton from '../components/ui/IconButton';
import PullIndicator from '../components/ui/PullIndicator';
import OnboardingScreen from '../components/onboarding/OnboardingScreen';
import ImportRoutesSheet from '../components/share/ImportRoutesSheet';
import Toast from '../components/ui/Toast';
import { useToast } from '../hooks/useToast';
import { findStop, loadStopsList } from '../data/stops';
import { ROUTES_PARAM, decodeRoutes, toImportedCard } from '../lib/routesShare';
import { useNearestCard } from '../hooks/useNearestCard';
import { useDayPart } from '../hooks/useDayPart';
import { useNightMode } from '../hooks/useNightMode';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRoutes } from '../hooks/useRoutes';
import { useTheme } from '../hooks/useTheme';

// Las tarjetas se desvanecen al llegar al borde inferior del área de scroll
// (y un poco arriba, bajo la cabecera) en vez de cortarse en seco.
const SCROLL_FADE =
  '[mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)]';

// Fuera del modo edición no se arrastra: el orden de la vista no se guarda.
const ignoreReorder = () => {};

// Botones de la cabecera: 36px en móviles estrechos (caben los cuatro).
const HEADER_BUTTON = 'max-[400px]:h-9 max-[400px]:w-9';

// Duración de la salida de una tarjeta antes de quitarla del estado (igual que
// su `duration-[800ms]` en la lista): lenta y relajada.
const REMOVE_MS = 800;

// Cómo se abrió la app: accesos directos del icono (manifest `shortcuts`,
// `/?accion=escanear|buscar|nueva`) o una ruta compartida
// (`/?origen=6860&destino=8480`, ver `src/lib/share.js`).
const LAUNCH_ACTIONS = ['escanear', 'buscar', 'nueva'];
const LAUNCH_PARAMS = ['accion', 'origen', 'destino'];
const stopParam = (value) => (/^\d{1,6}$/.test(value ?? '') && Number(value) > 0 ? Number(value) : null);
function readLaunch() {
  const params = new URLSearchParams(window.location.search);
  // Un enlace con tarjetas (`?tarjetas=`) es otra cosa: lo lee `readImport`.
  if (params.has(ROUTES_PARAM)) return null;
  const origin = stopParam(params.get('origen'));
  const destination = stopParam(params.get('destino'));
  if (origin && destination) return { action: 'ruta', route: { origin, destination } };
  const action = params.get('accion');
  return LAUNCH_ACTIONS.includes(action) ? { action } : null;
}

// Colección de tarjetas recibida (`/?tarjetas=…`, `src/lib/routesShare.js`):
// `{ entries }`, `{ invalid: true }` si el enlace no vale, o `null`.
function readImport() {
  const value = new URLSearchParams(window.location.search).get(ROUTES_PARAM);
  if (value === null) return null;
  const entries = decodeRoutes(value);
  return entries ? { entries } : { invalid: true };
}

// Quita `tarjetas` de la URL sin recargar ni tocar lo demás (recargar no
// vuelve a preguntar).
function clearImportParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete(ROUTES_PARAM);
  window.history.replaceState(window.history.state, '', url);
}

/** Mensaje de la lista vacía (la app empieza sin tarjetas). */
function EmptyState() {
  const t = useT();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-black/70 dark:text-white/80">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5 dark:bg-white/15 dark:ring-white/10">
        <BusFront className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-xl font-semibold tracking-tight text-black dark:text-white">{t('dashboard.empty.title')}</p>
      <p className="text-base font-medium">{t('dashboard.empty.text')}</p>
    </div>
  );
}

/**
 * Pantalla inicial a pantalla completa (`100dvh`): cabecera arriba, tarjetas
 * con scroll propio en medio y "Crear nueva tarjeta" fijo abajo.
 */
export default function Dashboard({ settings, onSettingChange }) {
  const t = useT();
  const { routes, addRoute, removeRoute, reorderRoutes, updateRoute, importRoutes, refresh } = useRoutes({
    refreshMs: settings.refreshSeconds * 1000,
  });
  // Tarjeta que se está editando (modal del lápiz: alias y líneas).
  const [editingRouteId, setEditingRouteId] = useState(null);
  // Campana de un autobús de una tarjeta (modo salida): `{ stop, bus, fetchedAt }`.
  const [departureRequest, setDepartureRequest] = useState(null);
  const editingRoute = routes.find((route) => route.id === editingRouteId) ?? null;
  // Modo edición (botón "Editar" o pulsación larga en una tarjeta): las
  // tarjetas tiemblan, se arrastran desde su tirador y se borran con el botón
  // rojo. Sin tarjetas no hay nada que editar.
  const [isEditingRequested, setIsEditing] = useState(false);
  const isEditing = isEditingRequested && routes.length > 0;
  // Tirar hacia abajo desde arriba del todo vuelve a pedir los tiempos (no en
  // modo edición, donde los gestos son para mover tarjetas).
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const indicatorRef = useRef(null);
  const refreshing = usePullToRefresh({ scrollRef, contentRef, indicatorRef, onRefresh: refresh, enabled: !isEditing });
  // La paleta puede fijar el modo (Sombra, Cyberpunk y OLED: oscuro; Nube: claro).
  const { theme, forced: forcedTheme, toggleTheme } = useTheme(forcedScheme(settings.palette));
  // Abierta desde un acceso directo: "Escanear QR" y "Buscar parada" abren la
  // consulta rápida (con el escáner o el destino enfocado); "Nueva tarjeta",
  // su hoja. Se lee una vez y se quita de la URL (recargar no lo repite).
  // Una ruta compartida abre la consulta rápida con ese Origen y Destino.
  const [launch] = useState(readLaunch);
  useEffect(() => {
    if (!launch) return;
    const url = new URL(window.location.href);
    LAUNCH_PARAMS.forEach((param) => url.searchParams.delete(param));
    window.history.replaceState(window.history.state, '', url);
  }, [launch]);
  // Colección de rutas recibida: se lee antes del primer render y la hoja
  // pregunta qué hacer. Un enlace roto solo avisa.
  const [incoming, setIncoming] = useState(readImport);
  const [toast, showToast] = useToast(incoming?.invalid ? t('toast.importInvalid') : null);
  const invalidImport = Boolean(incoming?.invalid);
  useEffect(() => {
    if (invalidImport) clearImportParam();
  }, [invalidImport]);
  const handleImport = useCallback(
    async (mode) => {
      const { entries } = incoming;
      setIncoming(null);
      clearImportParam();
      // Los nombres de las paradas salen de `stopsList` (en el precache).
      await loadStopsList().catch(() => {});
      const cards = entries.map((entry) => toImportedCard(entry, findStop(entry.stopId)));
      const added = importRoutes(cards, mode);
      haptics.impact();
      showToast(mode === 'replace' ? t('toast.importReplaced') : t('toast.importAdded', { n: added }));
    },
    [incoming, importRoutes, showToast, t],
  );
  const cancelImport = useCallback(() => {
    setIncoming(null);
    clearImportParam();
  }, []);
  // Bienvenida (instalar y elegir icono): la primera vez en el navegador, sin
  // la app instalada. No si se abrió un enlace o un acceso directo (ya sabe a
  // qué viene); una vez vista o saltada, no vuelve (`vbus:onboarded`).
  const [onboarding, setOnboarding] = useState(() => !launch && !incoming && !isStandalone() && !isOnboarded());
  const finishOnboarding = useCallback(() => {
    markOnboarded();
    setOnboarding(false);
  }, []);
  const [isCreating, setIsCreating] = useState(launch?.action === 'nueva');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Consulta rápida (lupa): panel efímero Origen → Destino con los tiempos.
  // No se guarda nada salvo que se pulse "Añadir a Mis Rutas".
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(['escanear', 'buscar', 'ruta'].includes(launch?.action));
  // Cómo empieza la consulta rápida (solo la primera vez, si vino de un acceso
  // directo o de una ruta compartida).
  const [quickLookStart, setQuickLookStart] = useState(isQuickLookOpen ? launch : null);
  // Tarjetas que ya estaban guardadas al abrir la app: aparecen sin animación
  // de entrada (esa animación es solo para las que se crean ahora).
  const [savedIds] = useState(() => new Set(routes.map((route) => route.id)));
  // Tarjetas que están animando su salida: se quitan del estado al terminar.
  const [leavingIds, setLeavingIds] = useState(() => new Set());

  // Callbacks estables (reciben el id): las tarjetas memorizadas no se
  // repintan cuando el Dashboard se re-renderiza.
  const handleRemove = useCallback((id) => {
    if (prefersReducedMotion()) {
      removeRoute(id);
      return;
    }
    setLeavingIds((current) => new Set(current).add(id));
    setTimeout(() => {
      removeRoute(id);
      setLeavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, REMOVE_MS);
  }, [removeRoute]);
  const startEditing = useCallback(() => setIsEditing(true), []);
  // Saludo según el momento del día (días, tardes desde las 14:00, noches
  // desde las 21:00) y, en el Smart Night Mode (23:00–06:00), una luna discreta.
  const part = useDayPart();
  const night = useNightMode();
  // Solo se anima el cambio con la app abierta, no al abrirla.
  const [atStart] = useState(`${part}-${night}`);
  // Smart Sorting (Ajustes → "Ordenar tarjetas por cercanía"): la tarjeta de
  // la parada más cercana se enseña la primera. Es solo una vista: el orden
  // manual (`routes`, el del arrastre, en `vbus:routes`) no cambia nunca, y en
  // modo edición se ve y se arrastra ese orden.
  const { nearest } = useNearestCard(routes, settings.sortByProximity);
  const proximityOn = settings.sortByProximity && !isEditing && nearest != null;
  const shownRoutes = useMemo(
    () => (proximityOn ? withNearestFirst(routes, nearest.id) : routes),
    [proximityOn, routes, nearest],
  );

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+3rem)]">
      <header className="flex shrink-0 items-end justify-between gap-3 text-black dark:text-white">
        <div className="min-w-0">
          {/* `key`: el saludo cambia con un fundido al dar las 06:00, las 14:00,
              las 21:00 o las 23:00 (llega la luna). */}
          <p
            key={`${part}-${night}`}
            className={`flex items-center gap-1.5 text-xl font-semibold tracking-tight sm:text-2xl ${
              `${part}-${night}` !== atStart ? 'animate-fade-in motion-reduce:animate-none' : ''
            }`}
          >
            {t(`dashboard.greeting.${part}`)}
            {night && (
              <span title={t('dashboard.night.hint')}>
                <Moon className="h-4 w-4 fill-current opacity-60" strokeWidth={2.25} aria-hidden="true" />
                <span className="sr-only">{`· ${t('dashboard.night.hint')}`}</span>
              </span>
            )}
          </p>
          <h1 className="whitespace-nowrap text-[1.625rem] font-bold tracking-[-0.03em] min-[360px]:text-[1.875rem] min-[380px]:text-4xl sm:text-5xl">
            {t('dashboard.title')}
          </h1>
        </div>
        {/* Reloj encima de los botones, todo alineado a la derecha: consulta
            rápida (lupa), editar (lápiz, o check mientras se edita), tema y
            ajustes. En móviles estrechos los botones bajan a 36px para que
            quepan los cuatro junto al título. */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Clock />
          <div className="flex items-center gap-2 max-[400px]:gap-1.5">
            <IconButton
              tone="adaptive"
              icon={Search}
              label={t('dashboard.quickLook')}
              aria-haspopup="dialog"
              onClick={() => setIsQuickLookOpen(true)}
              className={HEADER_BUTTON}
            />
            {routes.length > 0 && (
              <IconButton
                tone="adaptive"
                icon={isEditing ? Check : Pencil}
                label={t(isEditing ? 'dashboard.editDone' : 'dashboard.edit')}
                aria-pressed={isEditing}
                onClick={() => setIsEditing((value) => !value)}
                className={HEADER_BUTTON}
              />
            )}
            <ThemeToggle
              theme={theme}
              onToggle={toggleTheme}
              lockedBy={forcedTheme ? t(`palette.${settings.palette}`) : null}
              className={HEADER_BUTTON}
            />
            <IconButton
              tone="adaptive"
              icon={Settings}
              label={t('settings.title')}
              aria-haspopup="dialog"
              onClick={() => setIsSettingsOpen(true)}
              className={HEADER_BUTTON}
            />
          </div>
        </div>
      </header>

      {/* Área de scroll: el margen negativo deja sitio a las sombras de las
          tarjetas para que el recorte del scroll no las corte por los lados.
          Va en una única capa de GPU (`transform-gpu`, `will-change`) y nada de
          lo que contiene usa `backdrop-filter`: el scroll solo desplaza esa
          capa ya dibujada. */}
      {/* Pista del "tirar para actualizar": recorta el indicador, que espera
          oculto por encima. */}
      <div className="relative -mx-5 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <PullIndicator ref={indicatorRef} refreshing={refreshing} />
      {/* `layoutScroll`: framer-motion tiene en cuenta el scroll al medir las
          tarjetas que se reordenan. */}
      <motion.main
        layoutScroll
        ref={scrollRef}
        className={`min-h-0 flex-1 transform-gpu overflow-y-auto overscroll-contain px-5 will-change-transform ${SCROLL_FADE}`}
      >
        {/* Lo baja el gesto (`transform` escrito directamente, sin renders). */}
        <div ref={contentRef} className="relative min-h-full will-change-transform">
          {/* El mensaje de lista vacía está siempre montado y entra/sale con un
              fundido (con retardo al aparecer, para no pisar la salida de la
              última tarjeta). */}
          <div
            inert={routes.length > 0}
            className={`absolute inset-0 transition-opacity ease-out motion-reduce:transition-none ${
              routes.length > 0 ? 'opacity-0 duration-300' : 'opacity-100 delay-150 duration-500'
            }`}
          >
            <EmptyState />
          </div>

          {/* `pb-24`: la última tarjeta puede subir por encima del degradado.
              `Reorder.Group`: en modo edición las tarjetas se arrastran en
              vertical y cada cambio de orden se guarda al momento
              (`reorderRoutes` → LocalStorage). */}
          <Reorder.Group
            as="ul"
            axis="y"
            values={shownRoutes}
            // Solo se reordena (y se guarda) arrastrando en modo edición, sobre el orden manual.
            onReorder={isEditing ? reorderRoutes : ignoreReorder}
            className="flex flex-col pb-24 pt-4"
          >
            {shownRoutes.map((route, index) => (
              <EditableRouteItem
                key={route.id}
                route={route}
                index={index}
                editing={isEditing}
                leaving={leavingIds.has(route.id)}
                // Entrada solo para las tarjetas nuevas (`animate-card-in`).
                animateIn={!savedIds.has(route.id)}
                sortBy={settings.sortBy}
                timeFormat={settings.timeFormat}
                onRemove={handleRemove}
                onEditCard={setEditingRouteId}
                onStartEditing={startEditing}
                onDepartureAlarm={setDepartureRequest}
                // Indicador "A 120 m" en la que ha subido por cercanía.
                nearMeters={proximityOn && route.id === nearest.id ? nearest.meters : null}
              />
            ))}
          </Reorder.Group>
        </div>
      </motion.main>
      </div>

      <div className="shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2">
        <CreateCardButton onClick={() => setIsCreating(true)} />
      </div>

      <CreateCardSheet
        open={isCreating}
        onClose={() => setIsCreating(false)}
        onCreate={(route) => {
          // Se añade ya, y la hoja se cierra con su animación descubriéndola.
          addRoute(route);
          setIsCreating(false);
        }}
      />
      <DepartureAlarm request={departureRequest} onClose={() => setDepartureRequest(null)} />
      <EditCardModal
        route={editingRoute}
        onClose={() => setEditingRouteId(null)}
        onSave={(id, changes) => {
          updateRoute(id, changes);
          setEditingRouteId(null);
          // Las líneas que se vuelven a mostrar necesitan sus llegadas.
          refresh();
        }}
      />
      {/* `AnimatePresence`: el panel sigue montado mientras sale deslizándose. */}
      <AnimatePresence>
        {isQuickLookOpen && (
          <QuickLookSheet
            timeFormat={settings.timeFormat}
            refreshMs={settings.refreshSeconds * 1000}
            startWith={quickLookStart}
            onClose={() => {
              setIsQuickLookOpen(false);
              setQuickLookStart(null);
            }}
            onAdd={(route) => {
              addRoute(route);
              setIsQuickLookOpen(false);
              setQuickLookStart(null);
            }}
          />
        )}
      </AnimatePresence>
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onChange={onSettingChange}
        routes={routes}
      />
      <OnboardingScreen
        open={onboarding}
        appIcon={settings.appIcon}
        onAppIconChange={(icon) => onSettingChange('appIcon', icon)}
        onDone={finishOnboarding}
      />
      <ImportRoutesSheet
        entries={incoming?.entries ?? null}
        routes={routes}
        onChoose={handleImport}
        onCancel={cancelImport}
      />
      {/* Avisos de la importación ("3 rutas añadidas", "Enlace inválido"). */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom,0px))+6.75rem)] z-40 flex justify-center px-5">
        <Toast message={toast} />
      </div>
    </div>
  );
}
