import { PRESSABLE } from './pressable';

/** Botón de acción principal: píldora blanca a todo el ancho, contraste máximo. */
export default function PillButton({ className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-lg font-semibold text-black shadow-lg shadow-black/20 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-graphite disabled:opacity-40 disabled:shadow-none ${PRESSABLE} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
