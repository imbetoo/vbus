import { useEffect, useRef } from 'react';

// Duración de la animación de salida antes de cerrar el <dialog>.
const EXIT_MS = 300;

/**
 * Ventana flotante centrada sobre `<dialog>` nativo (foco atrapado y devuelto
 * al cerrar). Entra y sale con fundido + escalado (95 % → 100 %) según el
 * atributo `data-shown`: al cerrar se anima primero y después se cierra.
 */
export default function Modal({ open, onClose, label, className = '', children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open) {
      if (!dialog.open) dialog.showModal();
      // Un fotograma sin `data-shown` para que la entrada se anime.
      const frame = requestAnimationFrame(() => dialog.toggleAttribute('data-shown', true));
      return () => cancelAnimationFrame(frame);
    }
    dialog.toggleAttribute('data-shown', false);
    const timer = setTimeout(() => dialog.open && dialog.close(), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        // Escape: se cierra con la animación de salida, no de golpe.
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Solo el fondo (::backdrop) recibe el clic directamente en el dialog.
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto scale-95 rounded-[32px] border-[3px] border-graphite/85 bg-graphite/70 p-0 text-white opacity-0 shadow-2xl shadow-black/20 backdrop-blur-lg transition-all duration-300 ease-spring backdrop:bg-black/0 backdrop:transition-colors backdrop:duration-300 data-[shown]:scale-100 data-[shown]:opacity-100 data-[shown]:backdrop:bg-black/25 motion-reduce:transition-none ${className}`}
    >
      {children}
    </dialog>
  );
}
