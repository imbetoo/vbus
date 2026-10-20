/**
 * Punto de estado. `className` define el color (p. ej. `bg-urgent`); con
 * `ping` añade una onda animada. Respeta `prefers-reduced-motion`.
 */
export default function PingDot({ ping = true, className = '' }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {ping && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${className}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}
