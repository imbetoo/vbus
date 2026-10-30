/**
 * Respuestas hápticas centralizadas: todo lo que vibra en la app pasa por
 * aquí, siempre comprobado y en `try/catch` (nunca lanza).
 *
 * - Android (Chrome): Vibration API (`navigator.vibrate`) con duraciones y
 *   patrones de verdad.
 * - iPhone: Safari no tiene Vibration API (`navigator.vibrate` no existe).
 *   Desde iOS 18, marcar un interruptor nativo (`<input type="checkbox"
 *   switch>`) da el háptico del sistema, así que cada "vibración" es un clic
 *   en uno oculto: un toque ligero, sin duración. iOS solo lo permite dentro
 *   de un gesto del usuario (un toque, soltar el dedo): sirve para el nivel 1,
 *   pero la alarma, que salta sola, no puede vibrar en iPhone (ahí avisan el
 *   timbre y la notificación). En iOS 17 o anterior, y en escritorio, no hace
 *   nada.
 *
 * - Nivel 1, sutil (10–20 ms): confirma un gesto sin molestar.
 *   - `tap`: soltar algo, acción ligera (soltar una tarjeta arrastrada).
 *   - `select`: cambiar un interruptor o un control segmentado.
 *   - `impact`: activar algo con peso (la campana, levantar una tarjeta).
 *   - `threshold`: cruzar el umbral de un gesto (deslizar para borrar).
 * - Nivel 2, alarma (`alarm`): fuerte y larga, para notarla en el bolsillo.
 */

export const ALARM_PATTERN = [500, 200, 500, 200, 500];

const HAS_VIBRATE = typeof navigator !== 'undefined' && 'vibrate' in navigator;
// Sin Vibration API pero con pantalla táctil: iPhone/iPad (el truco del interruptor).
const USE_SWITCH = typeof navigator !== 'undefined' && !HAS_VIBRATE && navigator.maxTouchPoints > 0;

function vibrate(pattern) {
  if (!HAS_VIBRATE) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

let switchLabel = null;

// Un toque háptico de iOS: clic en un interruptor nativo oculto. Va dentro del
// diálogo modal abierto, si lo hay (fuera de él la página está inerte).
function iosTick() {
  if (!USE_SWITCH) return false;
  try {
    if (!switchLabel) {
      switchLabel = document.createElement('label');
      switchLabel.setAttribute('aria-hidden', 'true');
      switchLabel.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      switchLabel.append(input);
    }
    const dialogs = document.querySelectorAll('dialog[open]');
    const host = dialogs[dialogs.length - 1] ?? document.body;
    if (switchLabel.parentNode !== host) host.append(switchLabel);
    switchLabel.click();
    return true;
  } catch {
    return false;
  }
}

// En Android, la duración o el patrón; en iPhone, `ticks` toques seguidos.
function feedback(pattern, ticks = 1) {
  if (HAS_VIBRATE) return vibrate(pattern);
  if (!iosTick()) return false;
  for (let i = 1; i < ticks; i++) setTimeout(iosTick, i * 120);
  return true;
}

export const haptics = {
  tap: () => feedback(10),
  select: () => feedback(12),
  impact: () => feedback(20, 2),
  threshold: () => feedback(15),
  alarm: () => feedback(ALARM_PATTERN, 3),
  /** Corta cualquier vibración en curso (al terminar un aviso). */
  stop: () => vibrate(0),
};
