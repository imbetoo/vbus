/**
 * Número de parada a partir del texto de un QR de marquesina de Vitrasa.
 *
 * - QR actual ("Próximas chegadas", Siam):
 *   `https://infobus.vitrasa.es:8002/Default.aspx?parada=8480`.
 * - Carteles más antiguos u otros formatos: cualquier URL con el número en un
 *   parámetro `parada` (o `idParada`, `codParada`), o el número solo ("1600").
 *   En dominios de Vitrasa o del Concello también valen parámetros genéricos
 *   (`stop`, `codigo`, `id`…) y el número al final de la ruta
 *   (`…/parada/1600`); en otras webs no, para no confundir cualquier enlace
 *   con un número con una parada.
 *
 * Devuelve el número (entero positivo) o `null` si el QR no es de una parada.
 */
const STOP_PARAM = /^(parada|idparada|codparada|cod_parada)$/i;
const GENERIC_PARAM = /^(stop|stopid|stop_id|codigo|cod|id)$/i;
const OWN_HOST = /(^|\.)(vitrasa\.es|vigo\.org)$/i;
const STOP_NUMBER = /^\d{1,6}$/;

const toStopId = (value) => {
  const text = String(value ?? '').trim();
  const number = STOP_NUMBER.test(text) ? Number(text) : 0;
  return number > 0 ? number : null;
};

export function parseStopQr(content) {
  const text = String(content ?? '').trim();
  if (!text) return null;
  const plain = toStopId(text);
  if (plain) return plain;

  let url = null;
  try {
    url = new URL(text);
  } catch {
    url = null;
  }
  if (url) {
    const own = OWN_HOST.test(url.hostname);
    for (const [key, value] of url.searchParams) {
      if (STOP_PARAM.test(key) || (own && GENERIC_PARAM.test(key))) {
        const id = toStopId(value);
        if (id) return id;
      }
    }
    return own ? toStopId(url.pathname.split('/').filter(Boolean).at(-1)) : null;
  }
  // Texto libre: "Parada 8480", "PARADA: 1600".
  const match = /parada\D{0,3}(\d{1,6})\b/i.exec(text);
  return match ? toStopId(match[1]) : null;
}
