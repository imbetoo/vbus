/**
 * Recorridos de Vitrasa con el orden de sus paradas (`routes.json`, generado
 * del GTFS oficial por `scripts/generate-routes.mjs`): dan a la consulta
 * rápida el sentido de la marcha.
 *
 * El fichero va aparte del código (`?url`): solo se pide al abrir la consulta
 * rápida, y el service worker lo precachea con el resto del build, así que
 * normalmente llega del caché al instante y también sin conexión. Si falla
 * (sin cobertura y aún sin caché) o viene vacío (el build no pudo descargar
 * el GTFS), la promesa se rechaza y la siguiente apertura lo vuelve a
 * intentar.
 */
import routesUrl from './routes.json?url';
import { buildRouteIndex } from '../lib/directRoute';

// Sin respuesta en este tiempo, se sigue sin recorridos (mejor un aviso que
// una espera infinita con mala cobertura).
const TIMEOUT_MS = 10_000;

let indexPromise = null;
let loadedIndex = null;

/** Índice ya cargado (`buildRouteIndex`), o `null`. */
export function getLoadedRouteIndex() {
  return loadedIndex;
}

/** Carga `routes.json` y construye su índice (una vez; si falla, se reintenta en la siguiente llamada). */
export function loadRouteIndex() {
  indexPromise ??= fetch(routesUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((response) => {
      if (!response.ok) throw new Error(`routes.json: HTTP ${response.status}`);
      return response.json();
    })
    .then((routes) => {
      const index = buildRouteIndex(routes);
      if (!index.routes.length) throw new Error('routes.json no tiene recorridos');
      loadedIndex = index;
      return index;
    })
    .catch((error) => {
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}
