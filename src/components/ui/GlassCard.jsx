import { PRESSABLE } from './pressable';

/**
 * Contenedor de cristal: grafito al 50 % con desenfoque de fondo, un degradado
 * interior y un brillo en el canto superior que le dan volumen, borde de 2px
 * (blanco translúcido en claro, grafito en oscuro) y esquinas de 32px. Rebota
 * al pulsar. `as` permite elegir la etiqueta.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[32px] border-2 border-white/15 bg-graphite/50 bg-gradient-to-b from-white/[0.08] to-white/0 p-5 text-white shadow-glass backdrop-blur-md dark:border-graphite/60 ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
