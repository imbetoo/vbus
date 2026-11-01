import { useSyncExternalStore } from 'react';
import { closeNotification, notificationStatus, requestNotificationPermission, unlockSound } from './alerts';
import { startLockScreen, stopLockScreen } from './lockScreen';
import { ensureScreenOn, keepScreenOn, releaseScreen } from './wakeLock';

/**
 * Sesión de un modo que avisa (modo viaje o modo salida), fuera del árbol de
 * componentes: sigue viva aunque se cierre la consulta rápida o se minimice
 * la pantalla negra a la píldora (`FocusHost` la pinta desde `App.jsx`).
 *
 * Una sola sesión a la vez: `{ id, kind, payload, view, notifications }`, o
 * `null`. `kind` es `trip` o `departure`; `view`, `full` (pantalla completa)
 * o `pill` (minimizada); `notifications`, el permiso (`notificationStatus`).
 */

/** Etiqueta de la notificación de cada modo (la reemplaza y permite quitarla). */
export const FOCUS_TAGS = { trip: 'vbus-trip', departure: 'vbus-departure' };

let session = null;
let nextId = 1;
const listeners = new Set();

function set(next) {
  session = next;
  listeners.forEach((listener) => listener());
}

/**
 * Empieza un modo. Llamar desde el toque del usuario: Safari solo deja
 * mantener la pantalla encendida, desbloquear el sonido y pedir permiso de
 * notificaciones dentro de un gesto. El permiso no se espera (el modo se abre
 * ya). Si ya había otro modo, lo sustituye (la pantalla sigue encendida).
 */
export function startFocus(kind, payload) {
  if (session) closeNotification(FOCUS_TAGS[session.kind]);
  keepScreenOn();
  unlockSound();
  // Widget de la pantalla de bloqueo (Media Session), también en el gesto.
  startLockScreen();
  const id = nextId++;
  set({ id, kind, payload, view: 'full', notifications: notificationStatus() });
  requestNotificationPermission().then((notifications) => {
    if (session?.id === id && session.notifications !== notifications) set({ ...session, notifications });
  });
}

/** Minimiza a la píldora. La pantalla sigue encendida: el aviso depende de ello. */
export function minimizeFocus() {
  if (session && session.view !== 'pill') set({ ...session, view: 'pill' });
}

/**
 * Vuelve a pantalla completa (tocar la píldora, "atrás" o el aviso). Desde un
 * toque, recupera la pantalla encendida y el sonido si el sistema los soltó.
 */
export function restoreFocus() {
  if (!session) return;
  ensureScreenOn();
  unlockSound();
  startLockScreen();
  if (session.view !== 'full') set({ ...session, view: 'full' });
}

/** Termina el modo: suelta la pantalla y quita su notificación. */
export function endFocus() {
  if (!session) return;
  const { kind } = session;
  releaseScreen();
  stopLockScreen();
  closeNotification(FOCUS_TAGS[kind]);
  set(null);
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** La sesión actual (se actualiza sola). */
export function useFocusSession() {
  return useSyncExternalStore(subscribe, () => session, () => null);
}
