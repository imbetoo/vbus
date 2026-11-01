import { useEffect } from 'react';
import { updateLockScreen } from '../lib/lockScreen';

/**
 * Pasa a la pantalla de bloqueo (`lockScreen.js`) el texto que ya calculan
 * los modos viaje y salida para la píldora. Solo actúa cuando cambia el texto
 * (dos strings como dependencias): sin estado ni re-renders.
 */
export function useLockScreenActivity(title, artist, live = true) {
  useEffect(() => {
    if (live && title) updateLockScreen({ title, artist });
  }, [title, artist, live]);
}
