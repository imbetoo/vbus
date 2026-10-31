/**
 * Compartir un trayecto directo con el menú nativo del sistema (Web Share
 * API: WhatsApp, Telegram…) y, si no existe o falla, copiándolo al
 * portapapeles.
 */

/**
 * Enlace que abre la app con ese trayecto ya puesto (consulta rápida con
 * Origen y Destino, ver `Dashboard`).
 */
export function routeShareUrl(origin, destination, base = window.location.origin) {
  const url = new URL('/', base);
  url.searchParams.set('origen', String(origin.id));
  url.searchParams.set('destino', String(destination.id));
  return url.href;
}

/**
 * "🚌 Ruta vBus: De Praza de Compostela a Rúa do Conde de Torrecedeira, 81.
 * Líneas directas: C3i, 5A. Consulta tiempos en https://…"
 */
export function routeShareText({ origin, destination, lines = [], url }) {
  const linesText = lines.length
    ? ` ${lines.length === 1 ? 'Línea directa' : 'Líneas directas'}: ${lines.join(', ')}.`
    : '';
  return `🚌 Ruta vBus: De ${origin.name} a ${destination.name}.${linesText} Consulta tiempos en ${url}`;
}

/**
 * Copia con la API moderna y, si no está o falla (contexto no seguro,
 * permiso), con el método clásico de un `<textarea>` seleccionado. Devuelve
 * si se pudo (nunca rechaza).
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Se prueba el método clásico.
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    // Dentro del diálogo modal abierto, si lo hay (fuera, no se puede enfocar).
    const dialogs = document.querySelectorAll('dialog[open]');
    (dialogs[dialogs.length - 1] ?? document.body).appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * Comparte `{ title, text }`. Resuelve (nunca rechaza):
 * - `shared`: el usuario eligió dónde compartirlo.
 * - `cancelled`: cerró el menú nativo (no es un error: no se avisa).
 * - `copied`: sin menú nativo (p. ej. escritorio) o falló; texto copiado.
 * - `failed`: no se pudo ni compartir ni copiar.
 */
export async function shareContent({ title, text }) {
  const data = { title, text };
  const canShare = typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data));
  if (canShare) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // NotAllowedError (sin gesto del usuario), fallo del sistema…: se copia.
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed';
}
