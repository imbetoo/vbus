import { useState } from 'react';
import { MOCK_ROUTES } from '../data/mockRoutes';

/**
 * Rutinas del usuario con sus próximas llegadas.
 *
 * Fase 1: devuelve los datos estáticos de `src/data/mockRoutes.js`.
 *
 * Futuro: las rutinas favoritas se leerán de LocalStorage y los tiempos reales
 * se pedirán a VigoBusAPI (JSON), que hace de intermediario con los endpoints
 * del ayuntamiento, así el cliente nunca los toca directamente (evita CORS).
 * La forma del array devuelto no debería cambiar.
 */
export function useRoutes() {
  const [routes] = useState(MOCK_ROUTES);
  return routes;
}
