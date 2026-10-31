/**
 * Icono de la app en la pantalla de inicio, elegido antes de instalar (la
 * bienvenida y Ajustes → "Icono de la app"). Cada variante tiene sus PNG
 * (`npm run icons`) y su manifest (`vite.config.js`); aquí solo se cambian
 * los `<link>` del `<head>`:
 *
 * - `<link rel="manifest">`: Chrome/Android y escritorio leen el manifest al
 *   instalar (Chromium vigila los cambios de este enlace).
 * - `<link rel="apple-touch-icon">`: Safari lo lee en el momento de "Añadir a
 *   pantalla de inicio".
 *
 * Una vez instalada, el sistema se queda con el icono que tenía al instalar.
 * Se guarda en `vbus:settings` (`appIcon`) y se aplica al arrancar, antes del
 * primer render.
 */

export const APP_ICONS = ['classic', 'dark', 'neon'];

const suffix = (id) => (id === 'classic' ? '' : `-${id}`);

/** Vista previa (SVG con esquinas redondeadas) de una variante. */
export const appIconPreview = (id) => (id === 'classic' ? '/icon.svg' : `/icon-${id}.svg`);

/** Pone la variante `id` en los `<link>` que leen los sistemas al instalar. */
export function applyAppIcon(id) {
  if (typeof document === 'undefined') return;
  const icon = APP_ICONS.includes(id) ? id : 'classic';
  const manifest = document.querySelector('link[rel="manifest"]');
  // En desarrollo no hay manifest (lo inyecta vite-plugin-pwa en el build).
  if (manifest) manifest.href = `/manifest${suffix(icon)}.webmanifest`;
  const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (touchIcon) touchIcon.href = `/apple-touch-icon${suffix(icon)}.png`;
}

/** La variante guardada en Ajustes (o la clásica). */
export function savedAppIcon() {
  try {
    const id = JSON.parse(localStorage.getItem('vbus:settings'))?.appIcon;
    return APP_ICONS.includes(id) ? id : 'classic';
  } catch {
    return 'classic';
  }
}

// Al cargar el módulo (antes del primer render): el icono guardado.
applyAppIcon(savedAppIcon());
