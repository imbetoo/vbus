/**
 * Historial de paradas elegidas ("Recientes", como en Apple Maps): las últimas
 * 5 en LocalStorage (`vbus:recent`), la más reciente primero y sin repetidas
 * (elegir una que ya estaba la sube arriba). Se guarda al elegir una parada en
 * un buscador, en "Paradas cerca de mí" o con el escáner QR.
 *
 * Seguro ante un LocalStorage vacío, con JSON inválido o bloqueado (modo
 * privado): en esos casos el historial está vacío y guardar no hace nada.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { stopById } from './stops';

const STORAGE_KEY = 'vbus:recent';
const MAX_RECENT = 5;

const listeners = new Set();
let cachedRaw;
let cachedList = [];

function readRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Solo entradas con número de parada y nombre (lo guardado puede venir roto).
function parse(raw) {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((stop) => Number.isInteger(stop?.id) && stop.id > 0 && typeof stop.name === 'string' && stop.name)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Paradas recientes (misma referencia mientras no cambien, para React). */
export function getRecentStops() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = raw ? parse(raw) : [];
  }
  return cachedList;
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Sin almacenamiento: el historial no se guarda.
  }
  listeners.forEach((listener) => listener());
}

/** Sube una parada (`{ id, name, lines?, lat?, lon? }`) al principio del historial. */
export function addRecentStop(stop) {
  const id = Number(stop?.id);
  if (!Number.isInteger(id) || id <= 0 || !stop.name) return;
  const entry = { id, name: stop.name, lines: Array.isArray(stop.lines) ? stop.lines : [] };
  if (Number.isFinite(stop.lat) && Number.isFinite(stop.lon)) Object.assign(entry, { lat: stop.lat, lon: stop.lon });
  write([entry, ...getRecentStops().filter((item) => item.id !== id)].slice(0, MAX_RECENT));
}

/** Quita una parada del historial (deslizar para borrar). */
export function removeRecentStop(id) {
  write(getRecentStops().filter((item) => item.id !== Number(id)));
}

/** Borra todo el historial. */
export function clearRecentStops() {
  write([]);
}

function subscribe(listener) {
  listeners.add(listener);
  // Otras pestañas de la app.
  const onStorage = (event) => event.key === STORAGE_KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Historial para la interfaz. Cada parada se completa con los datos actuales
 * de `stopsList` si está (líneas o coordenadas pueden haber cambiado).
 */
export function useRecentStops() {
  const recents = useSyncExternalStore(subscribe, getRecentStops, () => cachedList);
  return useMemo(() => recents.map((stop) => stopById(stop.id) ?? stop), [recents]);
}
