import { Reorder, motion } from 'framer-motion';
import { BusFront, Check, Pencil, Settings } from 'lucide-react';
import { useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import AliasModal from '../components/bus/AliasModal';
import EditableRouteItem from '../components/bus/EditableRouteItem';
import CreateCardButton from '../components/create-card/CreateCardButton';
import CreateCardSheet from '../components/create-card/CreateCardSheet';
import Clock from '../components/settings/Clock';
import SettingsModal from '../components/settings/SettingsModal';
import ThemeToggle from '../components/settings/ThemeToggle';
import IconButton from '../components/ui/IconButton';
import PullIndicator from '../components/ui/PullIndicator';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRoutes } from '../hooks/useRoutes';
import { useTheme } from '../hooks/useTheme';

// Las tarjetas se desvanecen al llegar al borde inferior del área de scroll
// (y un poco arriba, bajo la cabecera) en vez de cortarse en seco.
const SCROLL_FADE =
  '[mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)]';

// Duración de la salida de una tarjeta antes de quitarla del estado (igual que
// su `duration-[800ms]` en la lista): lenta y relajada.
const REMOVE_MS = 800;

/** Mensaje de la lista vacía (la app empieza sin tarjetas). */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-black/70 dark:text-white/80">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-black/5 dark:bg-white/15 dark:ring-white/10">
        <BusFront className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="text-xl font-semibold tracking-tight text-black dark:text-white">Aún no tienes rutas</p>
      <p className="text-base font-medium">Crea tu primera tarjeta con la parada y las líneas que usas a diario.</p>
    </div>
  );
}

/**
 * Pantalla inicial a pantalla completa (`100dvh`): cabecera arriba, tarjetas
 * con scroll propio en medio y "Crear nueva tarjeta" fijo abajo.
 */
export default function Dashboard({ settings, onSettingChange }) {
  const { routes, addRoute, removeRoute, reorderRoutes, renameRoute, refresh } = useRoutes();
  // Tarjeta cuyo alias se está editando (modal del lápiz).
  const [aliasRouteId, setAliasRouteId] = useState(null);
  const aliasRoute = routes.find((route) => route.id === aliasRouteId) ?? null;
  // Modo edición (botón "Editar" o pulsación larga en una tarjeta): las
  // tarjetas tiemblan, se arrastran desde su tirador y se borran con el botón
  // rojo. Sin tarjetas no hay nada que editar.
  const [isEditingRequested, setIsEditing] = useState(false);
  const isEditing = isEditingRequested && routes.length > 0;
  // Tirar hacia abajo desde arriba del todo vuelve a pedir los tiempos (no en
  // modo edición, donde los gestos son para mover tarjetas).
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const refreshing = usePullToRefresh({ scrollRef, trackRef, onRefresh: refresh, enabled: !isEditing });
  const { theme, toggleTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Tarjetas que ya estaban guardadas al abrir la app: aparecen sin animación
  // de entrada (esa animación es solo para las que se crean ahora).
  const [savedIds] = useState(() => new Set(routes.map((route) => route.id)));
  // Tarjetas que están animando su salida: se quitan del estado al terminar.
  const [leavingIds, setLeavingIds] = useState(() => new Set());

  const handleRemove = (id) => {
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
  };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+3rem)]">
      <header className="flex shrink-0 items-end justify-between gap-3 text-black dark:text-white">
        <div className="min-w-0">
          <p className="text-xl font-semibold tracking-tight sm:text-2xl">Buenos días</p>
          <h1 className="whitespace-nowrap text-[1.625rem] font-bold tracking-[-0.03em] min-[360px]:text-[1.875rem] min-[380px]:text-4xl sm:text-5xl">
            Mis rutas
          </h1>
        </div>
        {/* Reloj encima de los botones, todo alineado a la derecha: editar
            (lápiz, o check mientras se edita), tema y ajustes. */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Clock />
          <div className="flex items-center gap-2">
            {routes.length > 0 && (
              <IconButton
                tone="adaptive"
                icon={isEditing ? Check : Pencil}
                label={isEditing ? 'Terminar de editar' : 'Editar tarjetas'}
                aria-pressed={isEditing}
                onClick={() => setIsEditing((value) => !value)}
              />
            )}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <IconButton
              tone="adaptive"
              icon={Settings}
              label="Ajustes"
              aria-haspopup="dialog"
              onClick={() => setIsSettingsOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* Área de scroll: el margen negativo deja sitio a las sombras de las
          tarjetas para que el recorte del scroll no las corte por los lados.
          Va en una única capa de GPU (`transform-gpu`, `will-change`) y nada de
          lo que contiene usa `backdrop-filter`: el scroll solo desplaza esa
          capa ya dibujada. */}
      {/* Pista del "tirar para actualizar": recorta el indicador (que espera
          oculto por encima) y lleva las variables CSS del gesto. */}
      <div ref={trackRef} className="relative -mx-5 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <PullIndicator refreshing={refreshing} />
      {/* `layoutScroll`: framer-motion tiene en cuenta el scroll al medir las
          tarjetas que se reordenan. */}
      <motion.main
        layoutScroll
        ref={scrollRef}
        className={`min-h-0 flex-1 transform-gpu overflow-y-auto overscroll-contain px-5 will-change-transform ${SCROLL_FADE}`}
      >
        <div
          className="relative min-h-full will-change-transform"
          style={{ transform: 'translate3d(0, var(--pull, 0px), 0)', transition: 'var(--pull-transition, none)' }}
        >
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
          <Reorder.Group as="ul" axis="y" values={routes} onReorder={reorderRoutes} className="flex flex-col pb-24 pt-4">
            {routes.map((route, index) => (
              <EditableRouteItem
                key={route.id}
                route={route}
                index={index}
                editing={isEditing}
                leaving={leavingIds.has(route.id)}
                // Entrada solo para las tarjetas nuevas (`animate-card-in`).
                animateIn={!savedIds.has(route.id)}
                sortBy={settings.sortBy}
                onRemove={() => handleRemove(route.id)}
                onEditAlias={() => setAliasRouteId(route.id)}
                onStartEditing={() => setIsEditing(true)}
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
      <AliasModal
        route={aliasRoute}
        onClose={() => setAliasRouteId(null)}
        onSave={(id, alias) => {
          renameRoute(id, alias);
          setAliasRouteId(null);
        }}
      />
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onChange={onSettingChange}
      />
    </div>
  );
}
