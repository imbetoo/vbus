import { useSyncExternalStore } from 'react';

// Chrome/Edge/Android lanzan `beforeinstallprompt` una sola vez y muy pronto,
// quizá antes de abrir Ajustes: se escucha al cargar el módulo y se guarda.
let deferredPrompt = null;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sin la mini barra del navegador: lo ofrece el botón de Ajustes.
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => deferredPrompt;

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// Safari en iPhone/iPad no tiene `beforeinstallprompt`: se instala a mano desde
// Compartir. (El iPad se identifica como Mac con pantalla táctil.)
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Si la app se puede instalar: `canInstall` + `install()` en navegadores con
 * `beforeinstallprompt`; `iosHint` en iOS fuera de la app instalada.
 */
export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    // El evento solo sirve una vez, se acepte o no.
    deferredPrompt = null;
    emit();
  };

  return { canInstall: Boolean(prompt), install, iosHint: !prompt && isIOS() && !isStandalone() };
}
