import { useSyncExternalStore } from 'react';
import { isStandalone, platform } from '../lib/platform';

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

/**
 * Si la app se puede instalar: `canInstall` + `install()` en navegadores con
 * `beforeinstallprompt`; `iosHint` en iOS fuera de la app instalada.
 */
export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, getSnapshot, () => null);

  // Devuelve `accepted` o `dismissed` (o `null` si no había nada que instalar).
  const install = async () => {
    if (!prompt) return null;
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    // El evento solo sirve una vez, se acepte o no.
    deferredPrompt = null;
    emit();
    return choice?.outcome ?? null;
  };

  return { canInstall: Boolean(prompt), install, iosHint: !prompt && platform() === 'ios' && !isStandalone() };
}
