import { useEffect, useRef, useState } from 'react';
import { haptics } from '../lib/haptics';
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

// Toques que empiezan en algo que ya gestiona su propio arrastre (el tirador
// de una tarjeta, `touch-action: none`) o marcado con `data-no-pull`.
const ownsGesture = (target) => target instanceof Element && Boolean(target.closest('[data-no-pull], .touch-none'));

/**
 * "Tirar para actualizar" estilo iOS sobre un contenedor con scroll.
 *
 * Solo empieza si el dedo baja estando el scroll arriba del todo
 * (`scrollTop === 0`); hacia arriba, el scroll normal no se toca. Mientras se
 * tira, nada pasa por React y como mucho se escribe una vez por fotograma
 * (`requestAnimationFrame`):
 * - en `contentRef`, su `transform` (`translate3d`) directamente: no se hereda,
 *   así que mover la lista no recalcula el estilo de las tarjetas;
 * - en `indicatorRef` (unos pocos nodos), las variables CSS `--pull` (px),
 *   `--pull-progress` (0 a 1) y `--pull-transition`, que lee `PullIndicator`.
 *
 * Al cruzar el umbral, un toque háptico ligero (`haptics.threshold`; otra vez
 * si se vuelve atrás y se cruza de nuevo). Al soltar pasado él, la lista se
 * queda abierta mientras se espera `onRefresh()` y luego vuelve con un muelle;
 * si no, vuelve directamente. Con `enabled` a `false` (modo edición, donde se
 * arrastran tarjetas) no empieza, y si se desactiva a mitad, se abandona.
 *
 * `touchstart`, `touchend` y `touchcancel` son pasivos. `touchmove` no puede
 * serlo: `preventDefault()` es lo único que frena el scroll y el rebote nativos
 * mientras se tira (con `passive: true` el navegador lo ignora). Sale en la
 * primera línea cuando no hay gesto. Devuelve si está refrescando.
 */
export function usePullToRefresh({ scrollRef, contentRef, indicatorRef, onRefresh, enabled = true }) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    enabledRef.current = enabled;
  }, [onRefresh, enabled]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    let startY = null;
    let pull = 0;
    let armed = false;
    let busy = false;
    let alive = true;
    let frame = 0;
    let pending = null;

    const paint = () => {
      frame = 0;
      if (!pending) return;
      const { px, progress, duration } = pending;
      pending = null;
      const ease = duration && !prefersReducedMotion();
      const content = contentRef.current;
      if (content) {
        content.style.transition = ease ? `transform ${duration}ms ${SPRING}` : 'none';
        content.style.transform = px ? `translate3d(0, ${px}px, 0)` : '';
      }
      const indicator = indicatorRef?.current;
      if (indicator) {
        indicator.style.setProperty(
          '--pull-transition',
          ease ? `transform ${duration}ms ${SPRING}, opacity ${duration}ms ${SPRING}` : 'none',
        );
        indicator.style.setProperty('--pull', `${px}px`);
        indicator.style.setProperty('--pull-progress', String(progress));
      }
    };

    const setPull = (px, { progress = Math.min(px / PULL_THRESHOLD, 1), duration = 0 } = {}) => {
      pending = { px, progress, duration };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const reset = (duration = 250) => {
      pull = 0;
      armed = false;
      setPull(0, { duration });
    };

    const onStart = (event) => {
      pull = 0;
      armed = false;
      startY =
        enabledRef.current && !busy && event.touches.length === 1 && scroller.scrollTop <= 0 && !ownsGesture(event.target)
          ? event.touches[0].clientY
          : null;
    };

    const onMove = (event) => {
      if (startY === null) return;
      if (!enabledRef.current) {
        // Modo edición a mitad del gesto (pulsación larga): se abandona.
        startY = null;
        reset();
        return;
      }
      const dy = event.touches[0].clientY - startY;
      if (dy <= 0 || scroller.scrollTop > 0) {
        // Hacia arriba: es scroll normal, el gesto se abandona.
        if (pull) reset(0);
        if (dy < 0) startY = null;
        return;
      }
      if (event.cancelable) event.preventDefault();
      pull = rubberBand(dy);
      const past = pull >= PULL_THRESHOLD;
      if (past && !armed) haptics.threshold();
      armed = past;
      setPull(pull);
    };

    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (pull < PULL_THRESHOLD) {
        reset();
        return;
      }
      busy = true;
      setRefreshing(true);
      setPull(HOLD, { progress: 1, duration: 300 });
      try {
        await Promise.all([onRefreshRef.current?.(), wait(MIN_SPIN_MS)]);
      } catch {
        // El refresco avisa de sus propios errores; el gesto termina igual.
      } finally {
        busy = false;
        if (alive) {
          reset(500);
          setRefreshing(false);
        }
      }
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd, { passive: true });
    scroller.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollRef, contentRef, indicatorRef]);

  return refreshing;
}
