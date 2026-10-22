import { PRESSABLE } from './pressable';

/**
 * Contenedor de cristal: grafito al 50 % con desenfoque de fondo, un degradado
 * interior y un brillo en el canto superior que le dan volumen, borde de 2px
 * (blanco translúcido en claro, grafito en oscuro) y esquinas de 32px. Rebota
 * al pulsar. `as` permite elegir la etiqueta.
 *
 * Cada tarjeta va en su propia capa de GPU (`transform-gpu`, `will-change`,
 * `backface-visibility: hidden`): al hacer scroll el navegador la desplaza ya
 * compuesta en vez de repintar su cristal fotograma a fotograma, que es lo que
 * dejaba un rastro oscuro.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[32px] border-2 border-white/15 bg-graphite/50 bg-gradient-to-b from-white/[0.08] to-white/0 p-5 text-white shadow-glass backdrop-blur-md transform-gpu will-change-transform [backface-visibility:hidden] dark:border-graphite/60 ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
