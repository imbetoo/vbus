/**
 * Respuestas hápticas centralizadas: todo `navigator.vibrate` de la app pasa
 * por aquí. Siempre comprobado y en `try/catch`: en iPhone (Safari no tiene
 * vibración web), en escritorio o con la vibración bloqueada no hace nada y
 * nunca lanza.
 *
 * - Nivel 1, sutil (10–20 ms): confirma un gesto sin molestar.
 *   - `tap`: soltar algo, acción ligera (soltar una tarjeta arrastrada).
 *   - `select`: cambiar un interruptor o un control segmentado.
 *   - `impact`: activar algo con peso (la campana, levantar una tarjeta).
 *   - `threshold`: cruzar el umbral de un gesto (deslizar para borrar).
 * - Nivel 2, alarma (`alarm`): fuerte y larga, para notarla en el bolsillo.
 */

export const ALARM_PATTERN = [500, 200, 500, 200, 500];

function vibrate(pattern) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export const haptics = {
  tap: () => vibrate(10),
  select: () => vibrate(12),
  impact: () => vibrate(20),
  threshold: () => vibrate(15),
  alarm: () => vibrate(ALARM_PATTERN),
  /** Corta cualquier vibración en curso (al terminar un aviso). */
  stop: () => vibrate(0),
};
