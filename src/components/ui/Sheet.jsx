import { useRef } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';

const EXIT_MS = 450;

/**
 * Hoja inferior modal sobre `<dialog>` nativo: atrapa el foco y lo devuelve al
 * cerrar. Sube y baja deslizándose con la curva `ease-spring` mientras el fondo
 * se oscurece y desenfoca. El contenido se monta al abrir y se desmonta al
 * terminar de salir, así su estado empieza limpio cada vez.
 */
export default function Sheet({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open, onClose, exitMs: EXIT_MS });

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      {...dialogProps}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto h-[72dvh] max-h-none w-full max-w-md translate-y-full rounded-t-[32px] border-2 border-b-0 border-white/10 bg-graphite/90 p-0 text-white shadow-2xl shadow-black/30 transition-transform duration-[450ms] ease-spring backdrop:bg-black/0 backdrop:backdrop-blur-none backdrop:transition-all backdrop:duration-[450ms] backdrop:ease-spring data-[shown]:translate-y-0 data-[shown]:backdrop:bg-black/30 data-[shown]:backdrop:backdrop-blur-md motion-reduce:transition-none motion-reduce:backdrop:transition-none"
    >
      {mounted && (
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
          <div className="mx-auto mb-4 h-1.5 w-10 shrink-0 rounded-full bg-white/30" aria-hidden="true" />
          {children}
        </div>
      )}
    </dialog>
  );
}
