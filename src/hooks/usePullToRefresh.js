import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';

// Distancia (ya con fricción) a partir de la cual soltar dispara el refresco.
export const PULL_THRESHOLD = 64;
// Altura a la que se queda la lista mientras gira el indicador.
const HOLD = 56;
// Banda elástica de iOS: cuanto más se tira, menos avanza (nunca pasa de DIM).
const DIM = 280;
const RESISTANCE = 0.55;
const rubberBand = (distance) => (1 - 1 / ((distance * RESISTANCE) / DIM + 1)) * DIM;
// El indicador gira al menos esto aunque los datos lleguen al instante.
const MIN_SPIN_MS = 700;
const SPRING = 'cubic-bezier(0.25, 1, 0.5, 1)';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "Tirar para actualizar" estilo iOS sobre un contenedor con scroll.
 *
 * Solo empieza si el dedo baja estando el scroll arriba del todo
 * (`scrollTop === 0`); hacia arriba, el scroll normal no se toca. La posición
 * no pasa por React: se escribe en variables CSS de `trackRef` (`--pull` en px,
 * `--pull-progress` de 0 a 1 y `--pull-transition`), que usan la lista
 * (`translateY`) y el indicador, así cada movimiento solo mueve capas en la GPU.
 *
 * Al soltar pasado el umbral, la lista se queda abierta mientras se espera
 * `onRefresh()` y luego vuelve a 0 con un muelle; si no, vuelve directamente.
 * `touchmove` se escucha con `passive: false` para poder frenar el rebote
 * nativo del navegador mientras se tira. Devuelve si está refrescando.
 */
export function usePullToRefresh({ scrollRef, trackRef, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const track = trackRef.current;
    let startY = null;
    let pull = 0;
    let busy = false;

    const setPull = (px, { progress = Math.min(px / PULL_THRESHOLD, 1), duration = 0 } = {}) => {
      const transition =
        duration && !prefersReducedMotion()
          ? `transform ${duration}ms ${SPRING}, opacity ${duration}ms ${SPRING}`
          : 'none';
      track.style.setProperty('--pull-transition', transition);
      track.style.setProperty('--pull', `${px}px`);
      track.style.setProperty('--pull-progress', String(progress));
    };

    const onStart = (event) => {
      startY = !busy && event.touches.length === 1 && scroller.scrollTop <= 0 ? event.touches[0].clientY : null;
      pull = 0;
    };

    const onMove = (event) => {
      if (startY === null) return;
      const dy = event.touches[0].clientY - startY;
      if (dy <= 0 || scroller.scrollTop > 0) {
        // Hacia arriba: es scroll normal, el gesto se abandona.
        if (pull) setPull(0);
        pull = 0;
        if (dy < 0) startY = null;
        return;
      }
      event.preventDefault();
      pull = rubberBand(dy);
      setPull(pull);
    };

    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (pull < PULL_THRESHOLD) {
        pull = 0;
        setPull(0, { duration: 250 });
        return;
      }
      busy = true;
      setRefreshing(true);
      setPull(HOLD, { progress: 1, duration: 300 });
      try {
        await Promise.all([onRefreshRef.current?.(), wait(MIN_SPIN_MS)]);
      } finally {
        pull = 0;
        setPull(0, { progress: 0, duration: 500 });
        busy = false;
        setRefreshing(false);
      }
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd);
    scroller.addEventListener('touchcancel', onEnd);
    return () => {
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollRef, trackRef]);

  return refreshing;
}
