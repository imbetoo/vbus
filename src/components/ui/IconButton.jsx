import { PRESSABLE } from './pressable';

// `glass`: sobre superficies grafito. `adaptive`: sobre el fondo de la app,
// legible en claro y en oscuro.
const TONES = {
  glass: 'bg-white/10 text-white active:bg-white/20 focus-visible:ring-white',
  adaptive:
    'bg-white/50 text-black shadow-sm shadow-black/5 backdrop-blur-md focus-visible:ring-black dark:bg-white/10 dark:text-white dark:focus-visible:ring-white',
};

/**
 * Botón circular de solo icono (44×44 pt, el área táctil mínima de Apple).
 * Muestra `icon` o, si se pasan, sus `children`.
 */
export default function IconButton({ icon: Icon, label, tone = 'glass', className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 ${TONES[tone]} ${PRESSABLE} ${className}`}
      {...props}
    >
      {children ?? <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden="true" />}
    </button>
  );
}
