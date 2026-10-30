import { useSyncExternalStore } from 'react';

/**
 * Pantalla siempre encendida durante el modo viaje (Screen Wake Lock API:
 * Chrome Android 84+, Safari 16.4+; en la app instalada de iPhone, iOS 18.4+).
 *
 * El sistema suelta el bloqueo al cambiar de app o de pestaña: al volver se
 * pide otra vez solo, mientras siga activo el modo viaje. Estados: `off`,
 * `pending`, `on`, `unsupported` (el navegador no puede) y `error` (lo
 * denegó: ahorro de batería, iframe…). Nunca lanza.
 */
let status = 'off';
let wanted = false;
let sentinel = null;
// Petición en vuelo: sin esto, un `visibilitychange` mientras se espera la
// primera lanzaba otra, y el bloqueo de la primera quedaba huérfano (nadie lo
// soltaba al terminar y la pantalla seguía encendida).
let requesting = false;
const listeners = new Set();

function setStatus(next) {
  if (next === status) return;
  status = next;
  listeners.forEach((listener) => listener());
}

async function acquire() {
  if (!('wakeLock' in navigator)) {
    setStatus('unsupported');
    return;
  }
  if (sentinel || requesting || document.visibilityState !== 'visible') return;
  requesting = true;
  setStatus('pending');
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!wanted || sentinel) {
      lock.release().catch(() => {});
      if (!wanted) setStatus('off');
      return;
    }
    sentinel = lock;
    setStatus('on');
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
      // Soltado por el sistema (pestaña oculta): se recupera al volver.
      setStatus(wanted ? 'pending' : 'off');
    });
  } catch {
    setStatus(wanted ? 'error' : 'off');
  } finally {
    requesting = false;
  }
}

function onVisibilityChange() {
  if (wanted && document.visibilityState === 'visible') acquire();
}

/** Mantiene la pantalla encendida (llamar desde el toque de "Avisarme": Safari lo exige). */
export function keepScreenOn() {
  if (wanted) return;
  wanted = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  acquire();
}

/**
 * Como `keepScreenOn`, pero si ya se quería y el sistema lo soltó (o lo
 * denegó), lo vuelve a pedir (llamar desde un toque: volver de la píldora).
 */
export function ensureScreenOn() {
  if (!wanted) keepScreenOn();
  else acquire();
}

/** Deja que la pantalla vuelva a bloquearse sola. */
export function releaseScreen() {
  if (!wanted) return;
  wanted = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  const lock = sentinel;
  sentinel = null;
  lock?.release().catch(() => {});
  setStatus('off');
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Estado actual del bloqueo de pantalla (se actualiza solo). */
export function useWakeLockStatus() {
  return useSyncExternalStore(subscribe, () => status, () => 'off');
}
