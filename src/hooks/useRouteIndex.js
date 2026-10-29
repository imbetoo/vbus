import { useEffect, useState } from 'react';
import { getLoadedRouteIndex, loadRouteIndex } from '../data/routes';

/**
 * Recorridos del GTFS para el sentido de la marcha (`loadRouteIndex`): se
 * piden al montar (al abrir la consulta rápida). Devuelve
 * `{ status, index }` con `status`: `loading`, `ready` o `error` (sin
 * recorridos: la consulta cae al cruce plano de líneas con un aviso).
 */
export function useRouteIndex() {
  const [state, setState] = useState(() => {
    const index = getLoadedRouteIndex();
    return index ? { status: 'ready', index } : { status: 'loading', index: null };
  });

  // Una petición por apertura del panel (si falla, se reintenta al volver a abrirlo).
  useEffect(() => {
    if (getLoadedRouteIndex()) return undefined;
    let alive = true;
    loadRouteIndex().then(
      (index) => alive && setState({ status: 'ready', index }),
      () => alive && setState({ status: 'error', index: null }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
