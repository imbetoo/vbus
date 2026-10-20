import { useState } from 'react';
import RouteCard from '../components/bus/RouteCard';
import CreateCardButton from '../components/create-card/CreateCardButton';
import CreateCardSheet from '../components/create-card/CreateCardSheet';
import { useRoutes } from '../hooks/useRoutes';

/** Pantalla inicial: las rutinas del usuario como tarjetas. */
export default function Dashboard() {
  const routes = useRoutes();
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-md pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] pt-[calc(env(safe-area-inset-top,0px)+3rem)]">
      <header className="text-black dark:text-white">
        <p className="text-xl font-extrabold sm:text-2xl">Buenos días</p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Mis rutas</h1>
      </header>

      <main className="mt-6 flex flex-col gap-5">
        {routes.map((route) => (
          <RouteCard key={route.id} {...route} />
        ))}
        <CreateCardButton onClick={() => setIsCreating(true)} />
      </main>

      <CreateCardSheet open={isCreating} onClose={() => setIsCreating(false)} />
    </div>
  );
}
