import { PRESSABLE } from './pressable';

/**
 * Contenedor de cristal: grafito al 50 % con desenfoque de fondo, borde
 * grafito de 3px al 85 %, sombra suave y esquinas de 32px. Rebota al pulsar.
 * `as` permite elegir la etiqueta.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[32px] border-[3px] border-graphite/85 bg-graphite/50 p-4 text-white shadow-xl shadow-black/10 backdrop-blur-md ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
