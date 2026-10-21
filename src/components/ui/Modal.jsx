import { useRef } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';

const EXIT_MS = 300;

/**
 * Ventana flotante centrada sobre `<dialog>` nativo (foco atrapado y devuelto
 * al cerrar). Entra y sale con fundido + escalado (95 % → 100 %) mientras el
 * resto de la pantalla se oscurece y desenfoca, como los modales de iOS.
 */
export default function Modal({ open, onClose, labelledBy, className = '', children }) {
  const ref = useRef(null);
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open, onClose, exitMs: EXIT_MS });

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      {...dialogProps}
      className={`m-auto scale-95 rounded-[32px] border-2 border-white/10 bg-graphite/85 p-0 text-white opacity-0 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all duration-300 ease-spring backdrop:bg-black/0 backdrop:backdrop-blur-none backdrop:transition-all backdrop:duration-300 backdrop:ease-spring data-[shown]:scale-100 data-[shown]:opacity-100 data-[shown]:backdrop:bg-black/30 data-[shown]:backdrop:backdrop-blur-md motion-reduce:transition-none motion-reduce:backdrop:transition-none ${className}`}
    >
      {mounted && children}
    </dialog>
  );
}
