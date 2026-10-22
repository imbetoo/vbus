import { PRESSABLE } from './pressable';

/**
 * Tarjeta grafito al 80 % con un degradado interior y un brillo en el canto
 * superior que le dan volumen, borde de 2px (blanco translúcido en claro,
 * grafito en oscuro) y esquinas de 32px. Rebota al pulsar. `as` permite
 * elegir la etiqueta.
 *
 * Sin `backdrop-filter` a propósito: en el Dashboard las tarjetas se desplazan
 * sobre un fondo animado y el desenfoque en movimiento deja rastro en
 * Chromium/WebKit. El color casi opaco mantiene el aspecto sin ese coste.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`relative rounded-[32px] border-2 border-white/15 bg-graphite/80 bg-gradient-to-b from-white/[0.08] to-white/0 p-5 text-white shadow-glass dark:border-graphite/60 ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
