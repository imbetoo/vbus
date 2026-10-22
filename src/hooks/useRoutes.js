import { useCallback, useState } from 'react';
import { MOCK_ROUTES } from '../data/mockRoutes';

/**
 * Rutinas del usuario con sus próximas llegadas.
 *
 * Parten de los datos estáticos de `src/data/mockRoutes.js`; las tarjetas que
 * crea el usuario (`addRoute`) se añaden al final con los tiempos obtenidos de
 * VigoBusAPI a través del adaptador.
 *
 * Futuro: las rutinas se guardarán en LocalStorage y sus tiempos se
 * refrescarán solos (auto-refresh de 30 s de la Fase 2).
 */
export function useRoutes() {
  const [routes, setRoutes] = useState(MOCK_ROUTES);
  const addRoute = useCallback((route) => setRoutes((current) => [...current, route]), []);
  return { routes, addRoute };
}
