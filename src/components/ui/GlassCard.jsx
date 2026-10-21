/**
 * Contenedor "Liquid Glass": grafito al 50 % con desenfoque de fondo, borde
 * de 1px blanco translúcido (reflejo de luz), sombra suave y esquinas de 32px.
 * `as` permite elegir la etiqueta.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-[32px] border border-white/15 bg-graphite/50 p-4 text-white shadow-xl shadow-black/10 backdrop-blur-md ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
