import { useEffect, useRef } from 'react';

/**
 * Hoja inferior modal sobre `<dialog>` nativo: atrapa el foco, se cierra con
 * Escape o tocando fuera y devuelve el foco al cerrar. El contenido solo se
 * monta mientras está abierta, así su estado empieza limpio cada vez.
 */
export default function Sheet({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        // Solo el fondo (::backdrop) recibe el clic directamente en el dialog.
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto h-[72dvh] max-h-none w-full max-w-md animate-sheet-up rounded-t-[32px] border border-b-0 border-white/15 bg-graphite/70 shadow-2xl shadow-black/20 p-0 text-white backdrop-blur-md motion-reduce:animate-none backdrop:bg-black/10 backdrop:backdrop-blur-lg"
    >
      {open && (
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-5">
          {children}
        </div>
      )}
    </dialog>
  );
}
