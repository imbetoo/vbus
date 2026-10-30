import { useEffect, useState } from 'react';
import { endFocus, minimizeFocus, restoreFocus, useFocusSession } from '../../lib/focusSession';
import DepartureSession from '../departure/DepartureSheet';
import TripSession from '../trip/TripSheet';

// Lo que tarda la pantalla negra en fundirse al terminar.
const EXIT_MS = 300;

/**
 * Pinta el modo que avisa activo (viaje o salida) desde `App.jsx`, fuera del
 * Dashboard y de la consulta rápida: la sesión (`src/lib/focusSession.js`)
 * sigue aunque se cierren, a pantalla completa o minimizada en la píldora.
 * Al terminar, la última sigue pintada (sin pedir nada: `live` a `false`)
 * mientras la pantalla se funde.
 */
export default function FocusHost() {
  const session = useFocusSession();
  const [shown, setShown] = useState(session);
  if (session && session !== shown) setShown(session);

  useEffect(() => {
    if (session || !shown) return undefined;
    const timer = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [session, shown]);

  if (!shown) return null;
  const Session = shown.kind === 'trip' ? TripSession : DepartureSession;
  return (
    <Session
      key={shown.id}
      session={shown}
      live={session?.id === shown.id}
      onEnd={endFocus}
      onMinimize={minimizeFocus}
      onRestore={restoreFocus}
    />
  );
}
