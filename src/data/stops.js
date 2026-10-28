/**
 * Paradas conocidas para el buscador predictivo de "Nueva tarjeta":
 *
 * 1. `stopsList.json`: todas las paradas de Vitrasa (1157) de los datos
 *    abiertos del Concello (número de marquesina, nombre, coordenadas y
 *    líneas). Se regenera con `node scripts/update-stops.mjs`.
 * 2. Las que el usuario ya ha encontrado por número (`rememberStop`, en
 *    LocalStorage `vbus:stops`) y las de sus tarjetas guardadas: cubren
 *    paradas nuevas que aún no estén en la lista.
 */
import { haversineMeters } from '../lib/geo';

const STORAGE_KEY = 'vbus:stops';

// La lista completa (~125 KB) va en su propio fichero y se pide al abrir
// "Nueva tarjeta", no al arrancar la app.
let stopsList = [];
let stopsListPromise = null;
export function loadStopsList() {
  stopsListPromise ??= import('./stopsList.json').then((module) => {
    stopsList = module.default;
    return stopsList;
  });
  return stopsListPromise;
}

/** Líneas que pasan por una parada según los datos abiertos (`[]` si no está o aún no se ha cargado la lista). */
export function stopLines(stopId) {
  return stopsList.find((stop) => stop.id === Number(stopId))?.lines ?? [];
}

/**
 * Paradas más cercanas a `position` (`{ lat, lon }`), con su distancia en
 * metros: las `limit` más próximas dentro de `maxMeters`. Si no hay ninguna
 * tan cerca, igualmente las `limit` más próximas (`withinRadius: false`), y
 * `nearestMeters` dice a cuánto está la primera (para detectar que se está
 * fuera de Vigo).
 */
export function nearestStops(position, { limit = 5, maxMeters = 800 } = {}) {
  const sorted = stopsList
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
    .map((stop) => ({ ...stop, distance: haversineMeters(position, stop) }))
    .sort((a, b) => a.distance - b.distance);
  const near = sorted.filter((stop) => stop.distance <= maxMeters).slice(0, limit);
  return {
    stops: near.length ? near : sorted.slice(0, limit),
    withinRadius: near.length > 0,
    nearestMeters: sorted[0]?.distance ?? Infinity,
  };
}

// En una calle larga hay muchas paradas (Torrecedeira tiene 9): se enseñan
// todas en una lista con scroll.
const MAX_RESULTS = 30;

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/** Guarda una parada encontrada (`{ id, name }`) para sugerirla en el futuro. */
export function rememberStop(stop) {
  if (!stop?.id || !stop?.name) return;
  const saved = readJson(STORAGE_KEY);
  const list = Array.isArray(saved) ? saved.filter((item) => item?.id !== stop.id) : [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: stop.id, name: stop.name }, ...list].slice(0, 200)));
  } catch {
    // Sin almacenamiento: el buscador solo usa la lista fija.
  }
}

function knownStops() {
  const byId = new Map();
  const add = (id, name, lines = []) => {
    const numericId = Number(id);
    if (Number.isInteger(numericId) && numericId > 0 && typeof name === 'string' && name && !byId.has(numericId)) {
      byId.set(numericId, { id: numericId, name, lines });
    }
  };
  for (const stop of stopsList) add(stop.id, stop.name, stop.lines);
  const remembered = readJson(STORAGE_KEY);
  if (Array.isArray(remembered)) for (const stop of remembered) add(stop?.id, stop?.name);
  const routes = readJson('vbus:routes');
  if (Array.isArray(routes)) for (const route of routes) add(route?.stopId, route?.stopName);
  return [...byId.values()];
}

/**
 * Separa el número del portal del final del nombre ("Rúa do Conde de
 * Torrecedeira, 81" → calle "Rúa do Conde de Torrecedeira" + ", 81"), para
 * que el número nunca quede cortado ni separado de la calle: en una misma
 * calle hay muchas paradas y el número es lo que las distingue.
 */
export function splitStopName(name) {
  const match = /^(.*?\S)(,?\s+\d+[a-z]?(?:\s*[-–]\s*\d+[a-z]?)?)$/i.exec(String(name).trim());
  return match ? { street: match[1], number: match[2] } : { street: String(name), number: '' };
}

// "Rúa do Conde" → "rua do conde": sin tildes, mayúsculas ni signos.
const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Número del portal del nombre, para ordenar una misma calle: 23 < 81 < 123.
const portal = (name) => Number(/(\d+)\D*$/.exec(name)?.[1] ?? Infinity);

/**
 * Paradas que encajan con lo escrito: por número (empieza por esas cifras) o
 * por dirección (contiene todas las palabras, en cualquier orden y sin
 * importar tildes). Primero las que empiezan igual, luego las que tienen una
 * palabra que empieza igual en el nombre principal y después en lo de entre
 * paréntesis; dentro de cada calle, por número de portal.
 */
export function searchStops(query) {
  const text = normalize(query);
  if (!text) return [];
  const words = text.split(' ');
  const isNumber = /^\d+$/.test(text);

  return knownStops()
    .map((stop) => {
      const name = normalize(stop.name);
      if (isNumber) return String(stop.id).startsWith(text) ? { stop, score: String(stop.id) === text ? 0 : 1 } : null;
      if (!words.every((word) => name.includes(word))) return null;
      // Nombre principal, sin lo de entre paréntesis ("Rúa de San Paio (Torreiro)").
      const main = normalize(stop.name.split('(')[0]);
      const startsWord = (haystack) =>
        words.every((word) => haystack.startsWith(word) || haystack.includes(` ${word}`));
      let score = 3;
      if (name.startsWith(text)) score = 0;
      else if (startsWord(main)) score = 1;
      else if (startsWord(name)) score = 2;
      return { stop, score };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.score - b.score ||
        splitStopName(a.stop.name).street.localeCompare(splitStopName(b.stop.name).street, 'es') ||
        portal(a.stop.name) - portal(b.stop.name) ||
        a.stop.id - b.stop.id,
    )
    .slice(0, MAX_RESULTS)
    .map(({ stop }) => stop);
}
