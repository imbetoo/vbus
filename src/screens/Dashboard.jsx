import { Settings } from 'lucide-react';
import { useState } from 'react';
import RouteCard from '../components/bus/RouteCard';
import CreateCardButton from '../components/create-card/CreateCardButton';
import CreateCardSheet from '../components/create-card/CreateCardSheet';
import SettingsModal from '../components/settings/SettingsModal';
import ThemeToggle from '../components/settings/ThemeToggle';
import IconButton from '../components/ui/IconButton';
import { useRoutes } from '../hooks/useRoutes';
import { useTheme } from '../hooks/useTheme';

/** Pantalla inicial: las rutinas del usuario como tarjetas. */
export default function Dashboard() {
  const routes = useRoutes();
  const { theme, toggleTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
      <header className="text-black transition-colors duration-700 ease-in-out dark:text-white">
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <IconButton
            tone="adaptive"
            icon={Settings}
            label="Ajustes"
            aria-haspopup="dialog"
            onClick={() => setIsSettingsOpen(true)}
          />
        </div>
        <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Buenos días</p>
        <h1 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Mis rutas</h1>
      </header>

      <main className="mt-6 flex flex-col gap-5">
        {routes.map((route) => (
          <RouteCard key={route.id} {...route} />
        ))}
        <CreateCardButton onClick={() => setIsCreating(true)} />
      </main>

      <CreateCardSheet open={isCreating} onClose={() => setIsCreating(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
