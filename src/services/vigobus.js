/**
 * Cliente de VigoBusAPI (https://github.com/David-Lor/VigoBusAPI).
 *
 * La API no tiene instancia pública: se despliega aparte (por defecto en
 * `http://localhost:5000`) y no envía cabeceras CORS. Por eso, por defecto
 * se llama a `/vigobus`, que el servidor de Vite reenvía a la API (ver
 * `vite.config.js`), y el navegador nunca hace una petición entre orígenes.
 * Con `VITE_VIGOBUS_API_URL` se puede apuntar a otra URL (que tendrá que
 * permitir CORS o servirse en el mismo origen).
 *
 * Endpoints usados (docs/openapi.yaml de la API):
 * - GET /stop/{stop_id}  → { stop_id, name, lat?, lon?, ... }   (404 si no existe)
 * - GET /buses/{stop_id}?get_all_buses=bool
 *       → { buses: [{ line, route, time, bus_id }], more_buses_available }
 */

import { guardAgainstLieFi, probeNetwork } from '../lib/network';
import { MOCK_STOPS, mockBusesResponse } from './vigobusMock';

export const VIGOBUS_API_URL = (import.meta.env.VITE_VIGOBUS_API_URL || '/vigobus').replace(/\/+$/, '');

// Mientras no haya backend, las funciones devuelven respuestas simuladas con
// la misma forma que la API (`vigobusMock.js`). `VITE_VIGOBUS_MOCK=false`
// vuelve a las peticiones reales.
export const VIGOBUS_USE_MOCK = import.meta.env.VITE_VIGOBUS_MOCK !== 'false';

// El backend gratuito de Render se duerme tras 15 min sin uso y tarda ~50 s
// en despertar: se espera hasta 60 s antes de dar la petición por perdida.
const TIMEOUT_MS = 60_000;
// Lie-Fi: si la API no ha contestado en 1 s, se comprueba si hay internet
// (`probeNetwork`, ≤3 s). Sin internet, la petición se aborta y se pasa al
// modo sin conexión en ≤4 s; con internet, es el servidor despertando y se
// sigue esperando (un corte ciego a los 4 s lo daría por caído cada mañana).
const LIE_FI_CHECK_MS = 1_000;

// Motivos de aborto propios (para distinguirlos de una cancelación de quien llama).
const OFFLINE = { reason: 'offline' };
const TIMEOUT = { reason: 'timeout' };

/**
 * Error de VigoBusAPI con un `kind` para que la UI decida qué mostrar:
 * `offline` (sin internet: modo avión o Lie-Fi), `network` (hay internet pero
 * la API está caída o inaccesible), `timeout`, `not_found` (parada que no
 * existe), `upstream` (falla Vitrasa: "Error Vitrasa") o `http` (otros).
 */
export class VigoBusError extends Error {
  constructor(message, { kind, status, cause } = {}) {
    super(message, { cause });
    this.name = 'VigoBusError';
    this.kind = kind;
    this.status = status;
  }
}

const offlineError = (cause) => new VigoBusError('Sin conexión a internet', { kind: 'offline', cause });

// Error de red (de `fetch` o al leer el cuerpo) → `VigoBusError` del tipo que toque.
async function networkError(error, { url, signal, controller }) {
  // Cancelación pedida por quien llama (p. ej. al desmontar): se propaga tal cual.
  if (signal?.aborted) return error;
  const reason = controller.signal.reason;
  if (reason === OFFLINE) return offlineError(error);
  if (reason === TIMEOUT) {
    return new VigoBusError(`VigoBusAPI no respondió en ${TIMEOUT_MS / 1000} s (${url})`, { kind: 'timeout', cause: error });
  }
  // Fallo inmediato (DNS, conexión rechazada…): ¿no hay internet o es la API?
  if (!(await probeNetwork())) return offlineError(error);
  return new VigoBusError(`No se pudo conectar con VigoBusAPI (${url}). ¿Está arrancada?`, {
    kind: 'network',
    cause: error,
  });
}

async function request(path, { signal } = {}) {
  const url = `${VIGOBUS_API_URL}${path}`;
  if (signal?.aborted) throw signal.reason;
  // Modo avión: ni se intenta.
  if (navigator.onLine === false) throw offlineError();

  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(TIMEOUT), TIMEOUT_MS);
  const stopLieFiGuard = guardAgainstLieFi(controller, OFFLINE, LIE_FI_CHECK_MS);
  const context = { url, signal, controller };

  try {
    let response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    } catch (error) {
      throw await networkError(error, context);
    }
    try {
      return await handleResponse(response, path, url);
    } catch (error) {
      // El cuerpo también puede cortarse a medias (Lie-Fi, aborto).
      if (error instanceof VigoBusError) throw error;
      throw await networkError(error, context);
    }
  } finally {
    clearTimeout(timeout);
    stopLieFiGuard();
    signal?.removeEventListener('abort', forwardAbort);
  }
}

async function handleResponse(response, path, url) {
  if (response.ok) return response.json();

  const detail = await response
    .json()
    .then((body) => body?.detail)
    .catch(() => undefined);
  const status = response.status;
  if (status === 404) {
    throw new VigoBusError(`No existe la parada (${path})`, { kind: 'not_found', status });
  }
  if (status === 408) {
    throw new VigoBusError('Vitrasa tardó demasiado en responder', { kind: 'upstream', status });
  }
  if (status >= 500) {
    // La API devuelve 500 cuando falla o no se entiende la fuente de Vitrasa; el
    // proxy de Vite devuelve 5xx sin JSON si la API está caída.
    if (detail) throw new VigoBusError(`Error Vitrasa: ${detail}`, { kind: 'upstream', status });
    throw new VigoBusError(`VigoBusAPI no disponible en ${url} (HTTP ${status}). ¿Está arrancada?`, {
      kind: 'network',
      status,
    });
  }
  throw new VigoBusError(`VigoBusAPI respondió HTTP ${status}${detail ? `: ${JSON.stringify(detail)}` : ''}`, {
    kind: 'http',
    status,
  });
}

function assertStopId(stopId) {
  if (!Number.isInteger(Number(stopId)) || Number(stopId) <= 0) {
    throw new VigoBusError(`ID de parada no válido: ${stopId}`, { kind: 'http' });
  }
}

/**
 * Despierta el backend (Render se duerme sin uso) al abrir la app, para que
 * esté listo cuando lleguen las peticiones de verdad. No espera respuesta ni
 * falla; con datos simulados no hace nada.
 */
export function wakeApi() {
  if (VIGOBUS_USE_MOCK) return;
  fetch(`${VIGOBUS_API_URL}/status`).catch(() => {});
}

/** Información de una parada (nombre y ubicación). Respuesta cruda de la API. */
export function getStop(stopId, { signal } = {}) {
  assertStopId(stopId);
  if (VIGOBUS_USE_MOCK) {
    const stop = MOCK_STOPS[Number(stopId)];
    // Igual que la API: 404 si la parada no existe.
    return stop
      ? Promise.resolve(structuredClone(stop))
      : Promise.reject(new VigoBusError(`No existe la parada ${stopId}`, { kind: 'not_found', status: 404 }));
  }
  return request(`/stop/${Number(stopId)}`, { signal });
}

/**
 * Autobuses que llegarán a una parada, con sus minutos restantes. Respuesta
 * cruda de la API. Por defecto la API devuelve una lista corta (5); con
 * `all: true` devuelve todos.
 */
export function getBuses(stopId, { all = false, signal } = {}) {
  assertStopId(stopId);
  if (VIGOBUS_USE_MOCK) return Promise.resolve(structuredClone(mockBusesResponse(Number(stopId), all)));
  return request(`/buses/${Number(stopId)}?get_all_buses=${all}`, { signal });
}
