import { useEffect, useRef } from 'react';
import { haptics } from '../lib/haptics';

const DELAY_MS = 500;
// Si el dedo se mueve más que esto, es scroll y no una pulsación larga.
const MOVE_TOLERANCE_PX = 10;

/**
 * Pulsación larga (500 ms sin mover el dedo), como en la pantalla de inicio de
 * iOS. Devuelve los manejadores de puntero para el elemento. Al dispararse
 * vibra (si el dispositivo puede) y se traga el clic que llega al soltar, para
 * no pulsar a la vez un botón de dentro. Con `enabled` a `false` no hace nada.
 */
export function useLongPress(onLongPress, { enabled = true } = {}) {
  const timer = useRef(null);
  const start = useRef(null);
  const fired = useRef(false);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };

  // Al desmontar, ningún temporizador pendiente.
  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    onPointerDown: (event) => {
      fired.current = false;
      if (!enabled || event.button !== 0) return;
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        fired.current = true;
        timer.current = null;
        haptics.tap();
        onLongPress();
      }, DELAY_MS);
    },
    onPointerMove: (event) => {
      if (!start.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    // El clic que llega al soltar tras la pulsación larga no debe pulsar nada.
    onClickCapture: (event) => {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
    // Sin menú contextual del navegador mientras se mantiene pulsado.
    onContextMenu: (event) => {
      if (enabled) event.preventDefault();
    },
  };
}
