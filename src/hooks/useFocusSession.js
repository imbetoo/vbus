import { useCallback, useEffect, useRef, useState } from 'react';
import {
  closeNotification,
  fireAlert,
  notificationStatus,
  repeatAlert,
  requestNotificationPermission,
  stopAlert,
  unlockSound,
} from '../lib/alerts';
import { keepScreenOn, releaseScreen } from '../lib/wakeLock';

// Tras avisar, el modo se apaga solo (pantalla, GPS y peticiones).
export const AUTO_END_MS = 5 * 60_000;
// El aviso se repite (vibración y timbre) por si el móvil va en el bolsillo:
// cada 4 s, 3 veces más, mientras no se toque "Entendido".
const REPEAT_EVERY_MS = 4_000;
const REPEATS = 3;

/**
 * Sesión de un modo a pantalla completa que avisa (modo viaje, modo salida).
 *
 * `start(payload)` debe llamarse desde un toque del usuario: Safari solo deja
 * mantener la pantalla encendida, desbloquear el sonido y pedir permiso de
 * notificaciones dentro de un gesto. El permiso no se espera (el modo se abre
 * ya) y `notifications` se actualiza cuando el usuario contesta. `end()`
 * suelta la pantalla y quita la notificación `tag`.
 *
 * Devuelve `{ active, notifications, start, end }` (`active`: el `payload`
 * mientras dura la sesión, o `null`).
 */
export function useFocusSession(tag) {
  const [active, setActive] = useState(null);
  const [notifications, setNotifications] = useState(notificationStatus);
  const activeRef = useRef(false);

  const start = useCallback((payload) => {
    keepScreenOn();
    unlockSound();
    setNotifications(notificationStatus());
    requestNotificationPermission().then(setNotifications);
    activeRef.current = true;
    setActive(payload);
  }, []);

  const end = useCallback(() => {
    activeRef.current = false;
    releaseScreen();
    closeNotification(tag);
    setActive(null);
  }, [tag]);

  // Si el componente desaparece a mitad de sesión (cambian los resultados),
  // la pantalla vuelve a poder bloquearse.
  useEffect(
    () => () => {
      if (activeRef.current) releaseScreen();
    },
    [],
  );

  return { active, notifications, start, end };
}

/**
 * Cuando `alarm` (`{ text }`) aparece: vibración de alarma, timbre a todo
 * volumen y notificación (`fireAlert`), repetidos 3 veces más cada 4 s
 * mientras sigue en pantalla, y a los 5 min el modo se apaga solo (`onEnd`).
 * Al cerrarse, se corta todo.
 */
export function useAlarmEffect(alarm, { title, tag, onEnd }) {
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    if (!alarm) return undefined;
    fireAlert(title, { body: alarm.text, tag });
    let repeats = 0;
    const repeat = setInterval(() => {
      repeats += 1;
      repeatAlert();
      if (repeats >= REPEATS) clearInterval(repeat);
    }, REPEAT_EVERY_MS);
    const timer = setTimeout(() => onEndRef.current?.(), AUTO_END_MS);
    return () => {
      clearInterval(repeat);
      clearTimeout(timer);
      stopAlert();
    };
  }, [alarm, title, tag]);
}
