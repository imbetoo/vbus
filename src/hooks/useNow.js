import { useEffect, useState } from 'react';

/**
 * `Date.now()` que se renueva cada `intervalMs` y al volver a la pestaña:
 * las cuentas atrás de los modos viaje y salida avanzan entre una petición a
 * Vitrasa y la siguiente.
 */
export function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);

  return now;
}
