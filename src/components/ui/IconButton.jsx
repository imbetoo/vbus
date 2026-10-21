import { PRESSABLE } from './pressable';

// `glass`: sobre hojas y modales grafito. `adaptive`: sobre el fondo de la
// app, legible en claro y en oscuro.
const TONES = {
  glass: 'bg-white/15 text-white active:bg-white/25 focus-visible:ring-white',
  adaptive:
    'bg-white/60 text-black ring-1 ring-black/10 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-black dark:bg-white/10 dark:text-white dark:ring-white/10 dark:focus-visible:ring-white',
};

/**
 * Botón circular de solo icono (40px). Un pseudo-elemento invisible amplía el
 * área táctil a 48px para respetar el mínimo de Apple. Muestra `icon` o, si se
 * pasan, sus `children`.
 */
export default function IconButton({ icon: Icon, label, tone = 'glass', className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full after:absolute after:-inset-1 after:rounded-full after:content-[''] focus-visible:outline-none focus-visible:ring-2 ${TONES[tone]} ${PRESSABLE} ${className}`}
      {...props}
    >
      {children ?? <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />}
    </button>
  );
}
