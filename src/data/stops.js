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

// La lista completa (~125 KB) va en su propio fichero: se precarga en un
// momento libre después de arrancar (`App.jsx`) y, si aún no está, al abrir
// un buscador.
let stopsList = [];
let stopsListPromise = null;
export function loadStopsList() {
  stopsListPromise ??= import('./stopsList.json').then((module) => {
    stopsList = module.default;
    buildListIndex();
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

// Resultados que se pintan: una lista corta se dibuja al instante en móvil y
// caben todas las paradas de una calle larga (Torrecedeira tiene 9).
const MAX_RESULTS = 15;

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

// "Rúa do Conde" → "rua do conde": sin tildes, mayúsculas ni signos.
const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

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

// Entrada del índice de búsqueda: todo lo que la búsqueda y la ordenación
// necesitan, calculado una sola vez por parada (no en cada pulsación).
function indexEntry(id, name, lines = []) {
  return {
    stop: { id, name, lines },
    idText: String(id),
    name: normalize(name),
    // Nombre principal, sin lo de entre paréntesis ("Rúa de San Paio (Torreiro)").
    main: normalize(name.split('(')[0]),
    street: splitStopName(name).street,
    // Número del portal, para ordenar una misma calle: 23 < 81 < 123.
    portal: Number(/(\d+)\D*$/.exec(name)?.[1] ?? Infinity),
  };
}

// Índice de las 1157 paradas: se construye una vez, al cargar la lista.
let listIndex = [];
// Paradas recordadas y de las tarjetas: solo se rehace si cambia lo guardado.
let extraKey = null;
let extraIndex = [];

function extraEntries(knownIds) {
  let remembered = null;
  let routes = null;
  try {
    remembered = localStorage.getItem(STORAGE_KEY);
    routes = localStorage.getItem('vbus:routes');
  } catch {
    // Sin almacenamiento: solo la lista fija.
  }
  const key = `${listIndex.length}|${remembered}|${routes}`;
  if (key === extraKey) return extraIndex;
  extraKey = key;
  const byId = new Map();
  const add = (id, name) => {
    const numericId = Number(id);
    if (Number.isInteger(numericId) && numericId > 0 && typeof name === 'string' && name) {
      if (!knownIds.has(numericId) && !byId.has(numericId)) byId.set(numericId, indexEntry(numericId, name));
    }
  };
  const parse = (text) => {
    try {
      const value = JSON.parse(text);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  for (const stop of parse(remembered)) add(stop?.id, stop?.name);
  for (const route of parse(routes)) add(route?.stopId, route?.stopName);
  extraIndex = [...byId.values()];
  return extraIndex;
}

let listIds = new Set();
function buildListIndex() {
  listIndex = stopsList.map((stop) => indexEntry(stop.id, stop.name, stop.lines));
  listIds = new Set(stopsList.map((stop) => stop.id));
}

const collator = new Intl.Collator('es');

/**
 * Paradas que encajan con lo escrito: por número (empieza por esas cifras) o
 * por dirección (contiene todas las palabras, en cualquier orden y sin
 * importar tildes). Primero las que empiezan igual, luego las que tienen una
 * palabra que empieza igual en el nombre principal y después en lo de entre
 * paréntesis; dentro de cada calle, por número de portal. Usa el índice
 * precalculado: en cada búsqueda solo se comparan textos.
 */
export function searchStops(query) {
  const text = normalize(query);
  if (!text) return [];
  const words = text.split(' ');
  const isNumber = /^\d+$/.test(text);
  const startsWord = (haystack) => words.every((word) => haystack.startsWith(word) || haystack.includes(` ${word}`));

  const matches = [];
  for (const entry of [...listIndex, ...extraEntries(listIds)]) {
    if (isNumber) {
      if (entry.idText.startsWith(text)) matches.push({ entry, score: entry.idText === text ? 0 : 1 });
      continue;
    }
    if (!words.every((word) => entry.name.includes(word))) continue;
    let score = 3;
    if (entry.name.startsWith(text)) score = 0;
    else if (startsWord(entry.main)) score = 1;
    else if (startsWord(entry.name)) score = 2;
    matches.push({ entry, score });
  }

  return matches
    .sort(
      (a, b) =>
        a.score - b.score ||
        collator.compare(a.entry.street, b.entry.street) ||
        a.entry.portal - b.entry.portal ||
        a.entry.stop.id - b.entry.stop.id,
    )
    .slice(0, MAX_RESULTS)
    .map(({ entry }) => entry.stop);
}
