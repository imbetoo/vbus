/**
 * Contenedor de cristal: grafito al 50 % con desenfoque de fondo, borde
 * grafito sólido de 4px y esquinas de 32px. `as` permite elegir la etiqueta.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[32px] border-4 border-graphite bg-graphite/50 p-4 text-white backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
