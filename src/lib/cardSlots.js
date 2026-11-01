/**
 * Orden inteligente por hora del día: cada tarjeta puede tener un momento
 * del día (`slot`) en que es "la de ahora". Son los mismos tramos que el
 * saludo de la cabecera (`dayPart.js`): `morning` (06:00–13:59),
 * `afternoon` (14:00–20:59) y `evening` (21:00–05:59). `any` (por defecto,
 * también si falta o no vale): no se mueve nunca.
 */
export const CARD_SLOTS = ['any', 'morning', 'afternoon', 'evening'];

const VALID = new Set(CARD_SLOTS);

/** El momento de una tarjeta, comprobado (las antiguas no lo tienen: `any`). */
export const cardSlot = (route) => (VALID.has(route?.slot) ? route.slot : 'any');

/**
 * Vista con las tarjetas del momento actual (`part`) primero, en tu orden, y
 * después el resto, también en tu orden. Solo es una vista: el orden
 * guardado no se toca. Si nada cambia, devuelve el mismo array (las tarjetas
 * memorizadas no se repintan).
 */
export function withDayPartFirst(routes, part) {
  const now = [];
  const rest = [];
  for (const route of routes) (cardSlot(route) === part ? now : rest).push(route);
  if (!now.length || !rest.length) return routes;
  const ordered = [...now, ...rest];
  return ordered.every((route, i) => route === routes[i]) ? routes : ordered;
}
