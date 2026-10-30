import { useEffect, useRef } from 'react';
import { fireAlert, repeatAlert, stopAlert } from '../lib/alerts';

// La sesión (pantalla encendida, sonido y permiso en el toque, minimizar a la
// píldora) vive en un store global: `src/lib/focusSession.js`.
export { useFocusSession } from '../lib/focusSession';

// Tras avisar, el modo se apaga solo (pantalla, GPS y peticiones).
export const AUTO_END_MS = 5 * 60_000;
// El aviso se repite (vibración y timbre) por si el móvil va en el bolsillo:
// cada 4 s, 3 veces más, mientras no se toque "Entendido".
const REPEAT_EVERY_MS = 4_000;
const REPEATS = 3;

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
