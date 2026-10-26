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

import { MOCK_STOPS, mockBusesResponse } from './vigobusMock';

export const VIGOBUS_API_URL = (import.meta.env.VITE_VIGOBUS_API_URL || '/vigobus').replace(/\/+$/, '');

// Mientras no haya backend, las funciones devuelven respuestas simuladas con
// la misma forma que la API (`vigobusMock.js`). `VITE_VIGOBUS_MOCK=false`
// vuelve a las peticiones reales.
export const VIGOBUS_USE_MOCK = import.meta.env.VITE_VIGOBUS_MOCK !== 'false';

// El backend gratuito de Render se duerme tras 15 min sin uso y tarda ~50 s
// en despertar: se espera hasta 60 s antes de dar la petición por perdida.
const TIMEOUT_MS = 60_000;

/**
 * Error de VigoBusAPI con un `kind` para que la UI decida qué mostrar:
 * `network` (API caída o inaccesible), `timeout`, `not_found` (parada que no
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

function withTimeout(signal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  return signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal ?? timeout;
}

async function request(path, { signal } = {}) {
  const url = `${VIGOBUS_API_URL}${path}`;
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal: withTimeout(signal) });
  } catch (error) {
    // Cancelación pedida por quien llama (p. ej. al desmontar): se propaga tal cual.
    if (signal?.aborted) throw error;
    if (error.name === 'TimeoutError') {
      throw new VigoBusError(`VigoBusAPI no respondió en ${TIMEOUT_MS / 1000} s (${url})`, {
        kind: 'timeout',
        cause: error,
      });
    }
    throw new VigoBusError(`No se pudo conectar con VigoBusAPI (${url}). ¿Está arrancada?`, {
      kind: 'network',
      cause: error,
    });
  }

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
