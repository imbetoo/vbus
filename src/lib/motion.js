/** Si el sistema pide reducir el movimiento (animaciones desactivadas). */
export function prefersReducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
