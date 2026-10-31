/**
 * Momento del día para el saludo de la cabecera (hora del dispositivo):
 * `morning` de 06:00 a 13:59 ("Buenos días"), `afternoon` de 14:00 a 20:59
 * ("Buenas tardes") y `evening` de 21:00 a 05:59 ("Buenas noches"). La noche
 * del saludo empieza antes que el Smart Night Mode (23:00), que es el que
 * cambia las listas y enseña la luna.
 */
const BOUNDARIES = [
  { hour: 6, part: 'morning' },
  { hour: 14, part: 'afternoon' },
  { hour: 21, part: 'evening' },
];

/** `morning`, `afternoon` o `evening` en `date`. */
export function dayPart(date = new Date()) {
  const hour = date.getHours();
  const current = [...BOUNDARIES].reverse().find((boundary) => hour >= boundary.hour);
  return (current ?? BOUNDARIES.at(-1)).part;
}

/** Milisegundos hasta el próximo cambio (las 06:00, las 14:00 o las 21:00). */
export function msUntilDayPartChange(date = new Date()) {
  const next = BOUNDARIES.map(({ hour }) => {
    const at = new Date(date);
    at.setHours(hour, 0, 0, 0);
    if (at <= date) at.setDate(at.getDate() + 1);
    return at;
  }).reduce((a, b) => (a < b ? a : b));
  return next - date;
}
