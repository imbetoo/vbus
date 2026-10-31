import { useState } from 'react';
import { PRESSABLE } from '../ui/pressable';
import { useT } from '../../i18n';

/**
 * Una pastilla de línea. El círculo de prioridad está siempre en el DOM y
 * ocupa su sitio (de vacío pasa a blanco con el número), así el ancho de la
 * pastilla no cambia nunca al tocarla y las demás no saltan de fila.
 */
function LineChip({ line, color, priority, onToggle }) {
  const t = useT();
  const pressed = priority > 0;
  // Se conserva el último número mientras el círculo se desvanece al quitarla
  // (estado ajustado en render, sin efectos).
  const [shownPriority, setShownPriority] = useState(priority);
  if (pressed && priority !== shownPriority) setShownPriority(priority);

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onToggle(line)}
      className={`flex items-center gap-1 rounded-full border p-1 text-base font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
        pressed ? 'border-white/70 bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/70'
      }`}
    >
      <span
        className={`${color} flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-base font-medium tracking-wide text-white shadow-relief`}
      >
        <span className="sr-only">{`${t('lineChip.line')} `}</span>
        {line}
      </span>
      {/* Hueco fijo de 36px: anillo vacío sin elegir, círculo con número al elegir. */}
      <span className="relative h-9 w-9 shrink-0 rounded-full ring-1 ring-inset ring-white/20">
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-white text-sm font-semibold tabular-nums text-black shadow-relief transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
            pressed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          {pressed && <span className="sr-only">{`${t('lineChip.priority')} `}</span>}
          {shownPriority || ''}
        </span>
      </span>
    </button>
  );
}

/**
 * Selector múltiple de líneas. `selected` guarda el orden en que se eligieron
 * (la prioridad): cada pastilla elegida muestra su número (1, 2, 3…).
 */
export default function LineChips({ lines, selected, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {lines.map(({ line, color }) => (
        <li key={line}>
          <LineChip line={line} color={color} priority={selected.indexOf(line) + 1} onToggle={onToggle} />
        </li>
      ))}
    </ul>
  );
}
