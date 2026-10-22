import { PRESSABLE } from './pressable';

/**
 * Contenedor de cristal: grafito al 50 % con un degradado interior y un brillo
 * en el canto superior que le dan volumen, borde de 2px (blanco translúcido en
 * claro, grafito en oscuro) y esquinas de 32px. Rebota al pulsar. `as` permite
 * elegir la etiqueta.
 *
 * `blur`: desenfoca lo que hay detrás (`backdrop-filter`). Solo para elementos
 * fijos: en las tarjetas que se desplazan con el scroll, el navegador tiene que
 * recalcular ese desenfoque en cada fotograma y deja un rastro oscuro. Sin él,
 * la tarjeta lleva un grano fino que mantiene el aspecto de cristal mate.
 */
export default function GlassCard({ as: Component = 'div', blur = true, className = '', children, ...props }) {
  const glass = blur
    ? 'backdrop-blur-md'
    : // Grano detrás del contenido (`-z-10` dentro del contexto que crea `transform-gpu`).
      "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-grain before:bg-[length:160px_160px] before:opacity-[0.07] before:content-['']";

  return (
    <Component
      className={`relative rounded-[32px] border-2 border-white/15 bg-graphite/50 bg-gradient-to-b from-white/[0.08] to-white/0 p-5 text-white shadow-glass transform-gpu will-change-transform [backface-visibility:hidden] dark:border-graphite/60 ${glass} ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
