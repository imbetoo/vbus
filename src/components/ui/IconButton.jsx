import { PRESSABLE } from './pressable';

// `glass`: sobre hojas y modales grafito. `adaptive`: sobre el fondo de la
// app, legible en claro y en oscuro.
const TONES = {
  glass: 'bg-white/15 text-white active:bg-white/25 focus-visible:ring-white',
  adaptive:
    'bg-white/60 text-black ring-1 ring-black/10 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-black dark:bg-white/10 dark:text-white dark:ring-white/10 dark:focus-visible:ring-white',
};

// `md`: 40px. `sm`: 32px, para acciones secundarias dentro de tarjetas. En
// ambos, un pseudo-elemento invisible amplía el área táctil a ~48px.
const SIZES = {
  md: { button: 'h-10 w-10 after:-inset-1', icon: 'h-5 w-5' },
  sm: { button: 'h-8 w-8 after:-inset-2', icon: 'h-4 w-4' },
};

/**
 * Botón circular de solo icono, con área táctil ampliada para respetar el
 * mínimo de Apple. Muestra `icon` o, si se pasan, sus `children`.
 */
export default function IconButton({ icon: Icon, label, tone = 'glass', size = 'md', className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative flex ${SIZES[size].button} shrink-0 items-center justify-center rounded-full after:absolute after:rounded-full after:content-[''] focus-visible:outline-none focus-visible:ring-2 ${TONES[tone]} ${PRESSABLE} ${className}`}
      {...props}
    >
      {children ?? <Icon className={SIZES[size].icon} strokeWidth={2.25} aria-hidden="true" />}
    </button>
  );
}
