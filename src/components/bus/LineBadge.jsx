/** Distintivo de la línea con su color (p. ej. "C3" sobre azul). */
export default function LineBadge({ as: Component = 'span', line, color, className = '', ...props }) {
  return (
    <Component
      className={`${color} flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-2 text-base font-semibold text-white ${className}`}
      {...props}
    >
      <span className="sr-only">Línea </span>
      {line}
    </Component>
  );
}
