import { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Cada cuánto se busca una versión nueva con la app abierta.
const CHECK_EVERY_MS = 60 * 60_000;
// Si tras "Actualizar" el service worker nuevo no toma el control en este
// tiempo (navegador raro, ya no hay uno esperando), se recarga igualmente.
const RELOAD_FALLBACK_MS = 4_000;

/**
 * Actualizaciones de la PWA (OTA). Registra el service worker
 * (`useRegisterSW` de vite-plugin-pwa, modo `prompt`) y busca versiones
 * nuevas al abrir la app, al volver a ella (una PWA de iOS que se reanuda no
 * navega, así que si no se mira aquí podría quedarse en una versión vieja
 * durante días) y cada hora.
 *
 * Devuelve `{ available, updating, update, dismiss }`:
 * - `available`: hay una versión nueva instalada y esperando.
 * - `update()`: le dice al service worker nuevo que tome el control
 *   (`skipWaiting`: limpia lo viejo al activarse) y recarga la página con el
 *   código nuevo.
 * - `dismiss()`: "ahora no" (vuelve a avisar en el próximo arranque o con la
 *   siguiente versión).
 */
export function useAppUpdate() {
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [available, setAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        // Sin red o con una instalación en curso no hay nada que buscar.
        if (navigator.onLine === false || registration.installing) return;
        registration.update().catch(() => {});
      };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onRegisterError() {
      // Sin service worker (navegador antiguo, modo privado): la app funciona
      // igual, solo sin aviso de actualización.
    },
  });

  const update = useCallback(() => {
    setUpdating(true);
    // El registro recarga la página cuando el service worker nuevo toma el
    // control; por si no llega a pasar, se recarga igualmente.
    setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS);
    updateServiceWorker(true).catch(() => window.location.reload());
  }, [updateServiceWorker]);

  const dismiss = useCallback(() => setAvailable(false), [setAvailable]);

  return { available, updating, update, dismiss };
}
