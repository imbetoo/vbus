/**
 * Instalación de la PWA: si ya se usa instalada, en qué sistema (para las
 * instrucciones de la bienvenida) y la marca de la bienvenida vista. Sin
 * librerías: `matchMedia` y `navigator.userAgent`.
 */

/** ¿Se está usando la app instalada (pantalla de inicio o ventana propia)? */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    ['standalone', 'fullscreen', 'minimal-ui'].some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches)
  );
}

/** Sistema, para las instrucciones de instalar: `ios`, `android` o `desktop`. */
export function platform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  // El iPad con iPadOS se presenta como un Mac con pantalla táctil.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

const ONBOARDED_KEY = 'vbus:onboarded';

/** ¿Ya vio (o saltó) la bienvenida? Sin almacenamiento, se da por vista. */
export function isOnboarded() {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === 'true';
  } catch {
    return true;
  }
}

/** Marca la bienvenida como vista: no vuelve a salir. */
export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, 'true');
  } catch {
    // Sin almacenamiento: volverá a salir la próxima vez.
  }
}
