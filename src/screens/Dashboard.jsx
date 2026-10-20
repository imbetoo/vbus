import { Settings } from 'lucide-react';
import RouteCard from '../components/bus/RouteCard';
import IconButton from '../components/ui/IconButton';
import { useRoutes } from '../hooks/useRoutes';

/** Pantalla inicial: las rutinas del usuario como tarjetas. */
export default function Dashboard() {
  const routes = useRoutes();

  return (
    <div className="mx-auto min-h-screen max-w-md pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] pt-[env(safe-area-inset-top,0px)]">
      <header className="pt-2">
        <div className="flex h-11 items-center justify-end">
          <IconButton icon={Settings} label="Ajustes" className="-mr-2.5" />
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-steel-300">Buenos días</p>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-white">Mis Rutas</h1>
      </header>

      <main className="mt-6 flex flex-col gap-4">
        {routes.map((route) => (
          <RouteCard key={route.id} {...route} />
        ))}
      </main>
    </div>
  );
}
