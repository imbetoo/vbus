/**
 * Contenedor con efecto cristal: esquinas muy redondeadas, sombra sutil y
 * desenfoque de fondo. `as` permite elegir la etiqueta semántica.
 */
export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component
      className={`rounded-3xl border border-ice-100/80 bg-white/70 p-5 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
