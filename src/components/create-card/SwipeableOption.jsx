import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { haptics } from '../../lib/haptics';
import { prefersReducedMotion } from '../../lib/motion';

// Desliza más que esto (o más de un tercio de la fila) y, al soltar, se borra.
const THRESHOLD_PX = 110;
// Muelle de iOS para volver a su sitio o salir.
const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 };
const COLLAPSE_MS = 280;

/**
 * Opción de una lista de sugerencias que se borra deslizándola a la
 * izquierda, como en Mail de iOS (framer-motion, sin librerías extra): la
 * fila sigue al dedo 1:1 y destapa un fondo rojo con la papelera en blanco,
 * que crece al pasar el umbral (con un toque háptico al cruzarlo, en ambos
 * sentidos). Al soltar pasado el umbral, la fila sale por la izquierda y su
 * hueco se cierra; si no, vuelve con un muelle. Hacia la derecha apenas se
 * mueve (resistencia).
 *
 * Es un `<li role="option">` normal para el combobox (`id` para
 * `aria-activedescendant`): tocarla sin arrastrar la elige (`onChoose`).
 * Solo se anima `transform` (el rojo crece con `scaleX`) y `opacity`.
 */
export default function SwipeableOption({ id, selected, label, onChoose, onActivate, onRemove, children }) {
  const rowRef = useRef(null);
  const widthRef = useRef(320);
  const draggedRef = useRef(false);
  const armedRef = useRef(false);
  const [removing, setRemoving] = useState(false);
  const x = useMotionValue(0);
  const threshold = () => Math.min(THRESHOLD_PX, widthRef.current / 3);
  // El rojo ocupa justo lo destapado; la papelera aparece y crece al armarse.
  const redScale = useTransform(x, (value) => Math.min(1, Math.max(0, -value / widthRef.current)));
  const trashOpacity = useTransform(x, [-48, -16], [1, 0]);
  const trashScale = useTransform(x, (value) => (-value >= threshold() ? 1.15 : 0.85));

  const remove = () => {
    setRemoving(true);
    setTimeout(onRemove, prefersReducedMotion() ? 0 : COLLAPSE_MS);
  };

  return (
    <li
      ref={rowRef}
      id={id}
      role="option"
      aria-selected={selected}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onActivate}
      onClick={() => {
        // El clic que llega al soltar un arrastre no elige la parada.
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onChoose();
      }}
      // Al borrarse, su hueco se cierra (como las tarjetas) y desaparece.
      className={`grid cursor-pointer grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        removing ? 'pointer-events-none grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
      }`}
    >
      <div className="relative min-h-0 overflow-hidden">
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 origin-right bg-urgent"
          style={{ scaleX: redScale }}
        />
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 right-5 flex items-center text-white"
          style={{ opacity: trashOpacity, scale: trashScale }}
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.5} />
        </motion.span>
        <motion.div
          drag="x"
          dragDirectionLock
          dragMomentum={false}
          dragConstraints={{ left: -2000, right: 0 }}
          dragElastic={{ left: 0, right: 0.08 }}
          style={{ x }}
          onDragStart={() => {
            draggedRef.current = true;
            armedRef.current = false;
            widthRef.current = rowRef.current?.offsetWidth || widthRef.current;
          }}
          onDrag={(_, info) => {
            const armed = -info.offset.x >= threshold();
            if (armed !== armedRef.current) {
              armedRef.current = armed;
              haptics.threshold();
            }
          }}
          onDragEnd={(_, info) => {
            const width = widthRef.current;
            if (-info.offset.x >= threshold() || info.velocity.x < -800) {
              // Soltar sí es un gesto para iOS (el umbral, a mitad de arrastre, no siempre).
              haptics.impact();
              animate(x, -width, { ...SPRING, onComplete: remove });
            } else {
              animate(x, 0, SPRING);
            }
            // El clic que llega justo después ya se ignora; los siguientes no.
            setTimeout(() => {
              draggedRef.current = false;
            }, 0);
          }}
          // Transparente (el fondo de la lista): el rojo solo ocupa lo destapado.
          className={`relative flex touch-pan-y items-center gap-3 px-3.5 py-3 transition-colors duration-150 ${
            selected ? 'bg-white/10' : ''
          }`}
        >
          {children}
        </motion.div>
      </div>
    </li>
  );
}
