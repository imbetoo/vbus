/**
 * Punto con onda animada para llamar la atención. `className` define el color
 * (p. ej. `bg-urgent`). Respeta `prefers-reduced-motion`.
 */
export default function PingDot({ className = '' }) {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none ${className}`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}
