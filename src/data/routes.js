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
import { guardAgainstLieFi } from '../lib/network';

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
  indexPromise ??= fetchRoutes()
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

// Normalmente sale del precache al instante. Si no (aún sin service worker),
// va a la red: límite de 10 s y, con Lie-Fi, aborto en ≤4 s.
async function fetchRoutes() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException('routes.json', 'TimeoutError')), TIMEOUT_MS);
  const stopGuard = guardAgainstLieFi(controller, new DOMException('Sin conexión', 'AbortError'));
  try {
    const response = await fetch(routesUrl, { signal: controller.signal });
    if (!response.ok) throw new Error(`routes.json: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    stopGuard();
  }
}
