/**
 * Horarios teóricos de Vitrasa (`schedules.json`, generado del GTFS oficial
 * por `scripts/generate-routes.mjs`): sin conexión o con la API caída, la app
 * enseña los próximos autobuses según el horario (Feature #20).
 *
 * Va aparte del código (`?url`) y en el precache del service worker, así que
 * también llega sin conexión. Se pide la primera vez que hace falta (un
 * fallo de la API) o en segundo plano al arrancar. Si falla o viene vacío,
 * la siguiente llamada lo vuelve a intentar.
 *
 * Store de módulo (`useSyncExternalStore` en `useSchedules`): muchas tarjetas
 * comparten una sola carga.
 */
import schedulesUrl from './schedules.json?url';
import { fetchJsonAsset } from '../lib/network';

let data = null;
let promise = null;
const listeners = new Set();

/** Horarios ya cargados, o `null`. */
export function getLoadedSchedules() {
  return data;
}

/** Carga `schedules.json` (una vez; si falla, se reintenta en la siguiente llamada). */
export function loadSchedules() {
  promise ??= fetchJsonAsset(schedulesUrl, { timeoutMs: 10_000 })
    .then((json) => {
      if (json?.v !== 1 || !Array.isArray(json.p) || !json.p.length) throw new Error('schedules.json sin horarios');
      data = json;
      listeners.forEach((listener) => listener());
      return json;
    })
    .catch((error) => {
      promise = null;
      throw error;
    });
  return promise;
}

export function subscribeSchedules(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
