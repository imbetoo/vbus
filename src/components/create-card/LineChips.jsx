import { Check } from 'lucide-react';
import { PRESSABLE } from '../ui/pressable';

/**
 * Selector múltiple de líneas en pastillas de cristal: cada una muestra el
 * color de la línea y se marca con un check y un borde blanco al elegirla.
 */
export default function LineChips({ lines, selected, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {lines.map(({ line, color }) => {
        const pressed = selected.includes(line);

        return (
          <li key={line}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(line)}
              className={`flex h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
                pressed ? 'border-white/70 bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/70'
              }`}
            >
              <span
                className={`${color} flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-base font-medium tracking-wide text-white`}
              >
                <span className="sr-only">Línea </span>
                {line}
              </span>
              <Check
                className={`h-4 w-4 transition-all duration-300 ease-spring ${pressed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                strokeWidth={3}
                aria-hidden="true"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
