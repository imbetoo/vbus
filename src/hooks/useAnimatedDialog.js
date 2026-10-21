import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/**
 * Abre y cierra un `<dialog>` modal con animación de entrada y de salida.
 *
 * - Al abrir: `showModal()` y, un fotograma después, el atributo `data-shown`
 *   (las clases `data-[shown]:` del componente animan la entrada).
 * - Al cerrar: se quita `data-shown` para animar la salida y, cuando termina
 *   (`exitMs`), se llama a `dialog.close()`.
 *
 * Escape, tocar el fondo o la X llaman a `onClose`; el padre pone `open` a
 * `false` y se anima la salida. Devuelve `mounted` (el contenido debe seguir
 * montado mientras sale, y se desmonta al terminar para empezar limpio) y las
 * props para el `<dialog>`.
 */
export function useAnimatedDialog({ ref, open, onClose, exitMs }) {
  const [mounted, setMounted] = useState(open);
  // Estado derivado en render: al abrir, el contenido se monta en este render.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    const dialog = ref.current;
    if (open) {
      if (!dialog.open) dialog.showModal();
      // Fuerza el estilo inicial (sin `data-shown`) para que la entrada anime.
      void dialog.offsetHeight;
      const frame = requestAnimationFrame(() => dialog.toggleAttribute('data-shown', true));
      return () => cancelAnimationFrame(frame);
    }
    if (!dialog.open) return undefined;
    dialog.toggleAttribute('data-shown', false);
    const timer = setTimeout(() => dialog.close(), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [ref, open, exitMs]);

  const dialogProps = {
    onCancel: (event) => {
      // Escape: se anima la salida en vez de cerrar de golpe.
      event.preventDefault();
      onClose();
    },
    onClose: () => {
      // Cierre ya completado (tras la animación o forzado por el navegador).
      ref.current.toggleAttribute('data-shown', false);
      setMounted(false);
      onClose();
    },
    onClick: (event) => {
      // Solo el fondo (::backdrop) recibe el clic directamente en el dialog.
      if (event.target === event.currentTarget) onClose();
    },
  };

  return { mounted, dialogProps };
}
