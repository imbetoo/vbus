/**
 * Compartir "Mis rutas" entero sin backend: las tarjetas viajan en el propio
 * enlace (`/?tarjetas=…`), así se pueden pasar a otro móvil con un QR o por
 * mensaje. Es un parámetro aparte del de un trayecto (`?origen=&destino=`,
 * `share.js`), que no cambia.
 *
 * Formato: `{ v: 1, t: [[stopId, alias, lines, color, busesToShow], …] }`
 * en JSON → bytes UTF-8 (alias con tildes y emoji) → base64url sin relleno.
 * Sin tiempos ni ids: se regeneran al importar (`toImportedCard`).
 */
import { CARD_COLORS, DEFAULT_CARD_COLOR } from '../components/bus/cardColors';
import { toRouteCard } from '../services/vigobusAdapter';
import { lineKey } from './lines';

export const ROUTES_PARAM = 'tarjetas';
const VERSION = 1;
const MAX_CARDS = 50;
const MAX_ALIAS = 60;
const MAX_LINES = 30;
const COLORS = new Set(CARD_COLORS.map((color) => color.id));

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** Lo mínimo de una tarjeta para rehacerla en otro móvil. */
const toEntry = (route) => [
  Number(route.stopId),
  route.alias ?? '',
  route.lines ?? [],
  route.color ?? DEFAULT_CARD_COLOR,
  route.busesToShow ?? 3,
];

/** Las tarjetas codificadas para el enlace. */
export function encodeRoutes(routes) {
  return toBase64Url(JSON.stringify({ v: VERSION, t: routes.map(toEntry) }));
}

/** Enlace que abre vBus con estas tarjetas para importarlas. */
export function routesShareUrl(routes, base = window.location.origin) {
  const url = new URL('/', base);
  url.searchParams.set(ROUTES_PARAM, encodeRoutes(routes));
  return url.href;
}

// Una tarjeta del enlace, comprobada campo a campo (el enlace puede venir
// manipulado). `null` si no vale.
function readEntry(entry) {
  if (!Array.isArray(entry)) return null;
  const [stopId, alias, lines, color, busesToShow] = entry;
  if (!Number.isInteger(stopId) || stopId <= 0 || stopId > 999_999) return null;
  if (typeof alias !== 'string' || alias.length > MAX_ALIAS) return null;
  if (!Array.isArray(lines) || !lines.length || lines.length > MAX_LINES) return null;
  if (!lines.every((line) => typeof line === 'string' && line.trim() && line.length <= 10)) return null;
  return {
    stopId,
    alias: alias.trim(),
    lines: lines.map((line) => line.trim()),
    color: COLORS.has(color) ? color : DEFAULT_CARD_COLOR,
    busesToShow: busesToShow === 2 ? 2 : 3,
  };
}

/**
 * Las tarjetas de un enlace: `[{ stopId, alias, lines, color, busesToShow }]`
 * o `null` si el enlace no vale (base64 o JSON rotos, versión desconocida,
 * demasiadas, ninguna válida). Nunca lanza.
 */
export function decodeRoutes(text) {
  try {
    if (typeof text !== 'string' || !text || text.length > 20_000 || !/^[\w-]+$/.test(text)) return null;
    const data = JSON.parse(fromBase64Url(text));
    if (data?.v !== VERSION || !Array.isArray(data.t) || !data.t.length || data.t.length > MAX_CARDS) return null;
    const entries = data.t.map(readEntry).filter(Boolean);
    return entries.length ? entries : null;
  } catch {
    return null;
  }
}

/** Tarjeta completa a partir de una del enlace (`stop`: su parada de `stopsList`). */
export function toImportedCard(entry, stop) {
  return toRouteCard({
    stop: { id: entry.stopId, name: stop?.name ?? `Parada ${entry.stopId}` },
    buses: [],
    lines: entry.lines,
    title: entry.alias,
    busesToShow: entry.busesToShow,
    color: entry.color,
  });
}

const signature = (card) =>
  JSON.stringify([
    Number(card.stopId),
    (card.alias ?? '').trim(),
    (card.lines ?? []).map(lineKey),
    card.color ?? DEFAULT_CARD_COLOR,
    card.busesToShow ?? 3,
  ]);

/**
 * Las tarjetas de `incoming` que no están ya, exactamente iguales (misma
 * parada, alias, líneas en el mismo orden, color y autobuses visibles), en
 * `current` ni repetidas entre sí.
 */
export function newCards(current, incoming) {
  const seen = new Set(current.map(signature));
  return incoming.filter((card) => {
    const key = signature(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Lo que se ve de una tarjeta: su alias o el nombre de su parada. */
export function cardLabel(entry, stop) {
  return entry.alias || stop?.name || `Parada ${entry.stopId}`;
}
