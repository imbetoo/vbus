/**
 * Estado real de la red, más allá de `navigator.onLine`: con un router sin
 * internet ("Lie-Fi"), el navegador dice que hay conexión pero las peticiones
 * se quedan colgadas. `probeNetwork()` lo comprueba de verdad: una petición
 * mínima (HEAD) a nuestro propio dominio (Vercel, siempre rápido), saltándose
 * el caché y el service worker, con 3 s de límite.
 */
import { useSyncExternalStore } from 'react';

const PROBE_TIMEOUT_MS = 3_000;
// Varias peticiones que fallan a la vez comparten una sola comprobación.
const PROBE_REUSE_MS = 5_000;

let lastProbe = null;

const browserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** `true` si hay salida a internet (llega una respuesta, del código que sea). */
export function probeNetwork() {
  if (browserOffline()) return Promise.resolve(false);
  const now = Date.now();
  if (lastProbe && now - lastProbe.at < PROBE_REUSE_MS) return lastProbe.promise;
  let promise;
  try {
    // `?probe=…` no está en el precache: el service worker la deja ir a la red.
    promise = fetch(`${window.location.origin}/icon.svg?probe=${now}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    }).then(
      () => true,
      () => false,
    );
  } catch {
    promise = Promise.resolve(false);
  }
  lastProbe = { at: now, promise };
  return promise;
}

/**
 * Vigila una petición en curso: si a los `afterMs` no ha terminado, comprueba
 * la red y, si no hay internet (Lie-Fi), aborta `controller` con `reason`.
 * Devuelve la función que cancela la vigilancia (llamarla al terminar).
 */
export function guardAgainstLieFi(controller, reason, afterMs = 1_000) {
  const timer = setTimeout(() => {
    probeNetwork().then((online) => {
      if (!online && !controller.signal.aborted) controller.abort(reason);
    });
  }, afterMs);
  return () => clearTimeout(timer);
}

/**
 * JSON de la propia app (assets `?url`: lista de paradas, recorridos).
 * Normalmente sale del precache al instante; desde la red, con `timeoutMs` de
 * límite y aborto en ≤4 s si hay Lie-Fi. Con `fetch` (y no `import()`), un
 * fallo se puede reintentar: el navegador no lo recuerda como un módulo roto.
 */
export async function fetchJsonAsset(url, { timeoutMs = 10_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException(url, 'TimeoutError')), timeoutMs);
  const stopGuard = guardAgainstLieFi(controller, new DOMException('Sin conexión', 'AbortError'));
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    stopGuard();
  }
}

function subscribe(listener) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/**
 * Si el navegador cree que hay conexión (`online`/`offline`). Sirve para
 * reaccionar al instante al modo avión; el Lie-Fi lo detectan las peticiones
 * (`VigoBusError` de tipo `offline`).
 */
export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => !browserOffline(),
    () => true,
  );
}
