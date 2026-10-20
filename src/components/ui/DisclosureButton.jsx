import { ChevronRight } from 'lucide-react';

/** Botón de despliegue con chevron que gira al expandirse. */
export default function DisclosureButton({ expanded, onToggle, controls, children }) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded-lg py-1 text-base font-semibold text-white/80 transition active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <ChevronRight
        className={`h-5 w-5 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      {children}
    </button>
  );
}
