import STOPS_LIST from './stopsList.json';

/**
 * Paradas conocidas para el buscador predictivo de "Nueva tarjeta":
 *
 * 1. `stopsList.json`: paradas reales comprobadas (número, nombre oficial y
 *    coordenadas de datos.vigo.org).
 * 2. Las que el usuario ya ha encontrado por número (`rememberStop`, en
 *    LocalStorage `vbus:stops`) y las de sus tarjetas guardadas: el buscador
 *    aprende con el uso.
 */
const STORAGE_KEY = 'vbus:stops';
const MAX_RESULTS = 6;

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
  const add = (id, name) => {
    const numericId = Number(id);
    if (Number.isInteger(numericId) && numericId > 0 && typeof name === 'string' && name && !byId.has(numericId)) {
      byId.set(numericId, { id: numericId, name });
    }
  };
  for (const stop of STOPS_LIST) add(stop.id, stop.name);
  const remembered = readJson(STORAGE_KEY);
  if (Array.isArray(remembered)) for (const stop of remembered) add(stop?.id, stop?.name);
  const routes = readJson('vbus:routes');
  if (Array.isArray(routes)) for (const route of routes) add(route?.stopId, route?.stopName);
  return [...byId.values()];
}

// "Rúa do Conde" → "rua do conde": sin tildes, mayúsculas ni signos.
const normalize = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

/**
 * Paradas que encajan con lo escrito: por número (empieza por esas cifras) o
 * por dirección (contiene todas las palabras, en cualquier orden y sin
 * importar tildes). Primero las que empiezan igual.
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
      return { stop, score: name.startsWith(text) ? 0 : 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.stop.name.localeCompare(b.stop.name, 'es'))
    .slice(0, MAX_RESULTS)
    .map(({ stop }) => stop);
}
