import { BusFront, Settings } from 'lucide-react';
import { useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import RouteCard from '../components/bus/RouteCard';
import CreateCardButton from '../components/create-card/CreateCardButton';
import CreateCardSheet from '../components/create-card/CreateCardSheet';
import SettingsModal from '../components/settings/SettingsModal';
import ThemeToggle from '../components/settings/ThemeToggle';
import IconButton from '../components/ui/IconButton';
import { useRoutes } from '../hooks/useRoutes';
import { useTheme } from '../hooks/useTheme';

// Las tarjetas se desvanecen al llegar al borde inferior del área de scroll
// (y un poco arriba, bajo la cabecera) en vez de cortarse en seco.
const SCROLL_FADE =
  '[mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_16px,black_80%,transparent)]';

// Duración de la salida de una tarjeta antes de quitarla del estado.
const REMOVE_MS = 300;

/** Mensaje de la lista vacía (la app empieza sin tarjetas). */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-black/70 dark:text-white/80">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/50 ring-1 ring-black/5 backdrop-blur-md dark:bg-white/10 dark:ring-white/10">
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
export default function Dashboard() {
  const { routes, addRoute, removeRoute } = useRoutes();
  const { theme, toggleTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      <header className="shrink-0 text-black dark:text-white">
        <p className="text-xl font-semibold tracking-tight sm:text-2xl">Buenos días</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Mis rutas</h1>
          <div className="flex items-center gap-2">
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
          tarjetas para que el recorte del scroll no las corte por los lados. */}
      <main
        className={`-mx-5 mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${SCROLL_FADE}`}
      >
        {routes.length === 0 ? (
          <EmptyState />
        ) : (
          // `pb-24`: la última tarjeta puede subir por encima del degradado.
          <ul className="flex flex-col pb-24 pt-4">
            {routes.map((route) => {
              const leaving = leavingIds.has(route.id);
              // Salida: se desvanece y encoge mientras su hueco (alto + separación,
              // `pb-5`) se cierra con la técnica de grid, y las de abajo suben.
              // `minmax(0,1fr)` mantiene la tarjeta al ancho de la lista.
              return (
                <li
                  key={route.id}
                  inert={leaving}
                  className={`grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity,transform] duration-300 ease-smooth ${
                    leaving ? 'pointer-events-none scale-90 grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
                    <div className="pb-5">
                      <RouteCard {...route} onRemove={() => handleRemove(route.id)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

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
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
