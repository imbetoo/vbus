import { useCallback, useState } from 'react';

/**
 * Rutinas (tarjetas) del usuario. Empiezan vacías: cada tarjeta la crea el
 * usuario desde "Crear nueva tarjeta" con los tiempos de VigoBusAPI ya
 * adaptados (`toRouteCard`), y puede eliminarla.
 *
 * Futuro: se guardarán en LocalStorage y sus tiempos se refrescarán solos
 * (auto-refresh de 30 s de la Fase 2).
 */
export function useRoutes() {
  const [routes, setRoutes] = useState([]);
  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  const removeRoute = useCallback((id) => setRoutes((current) => current.filter((route) => route.id !== id)), []);
  return { routes, addRoute, removeRoute };
}
