import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'vbus:routes';

// Una tarjeta guardada es válida si tiene lo mínimo para pintarse; así un dato
// viejo o manipulado no rompe el render.
function isValidRoute(route) {
  return (
    route &&
    typeof route.id === 'string' &&
    typeof route.title === 'string' &&
    Array.isArray(route.lines) &&
    Array.isArray(route.buses)
  );
}

// Lectura inicial (síncrona, antes del primer render): si no hay nada o el
// JSON está corrupto, se empieza con `[]`.
function loadRoutes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isValidRoute) : [];
  } catch {
    return [];
  }
}

/**
 * Tarjetas del usuario, guardadas en LocalStorage con toda su personalización
 * (nombre, color, autobuses visibles, líneas y su orden de prioridad).
 * Empiezan vacías la primera vez.
 *
 * Futuro: los tiempos guardados son los del momento de crearlas; el
 * auto-refresh de la Fase 2 los pedirá de nuevo al abrir la app.
 */
export function useRoutes() {
  const [routes, setRoutes] = useState(loadRoutes);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): duran solo esta sesión.
    }
  }, [routes]);

  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  const removeRoute = useCallback((id) => setRoutes((current) => current.filter((route) => route.id !== id)), []);
  return { routes, addRoute, removeRoute };
}
