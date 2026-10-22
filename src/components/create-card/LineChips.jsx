import { Check } from 'lucide-react';
import { PRESSABLE } from '../ui/pressable';

/**
 * Selector múltiple de líneas en pastillas de cristal. `selected` guarda el
 * orden en que se eligieron (la prioridad). Al elegir una, su pastilla se
 * ilumina y aparece un check junto al nombre (crece desde ancho 0, así las
 * pastillas sin elegir quedan compactas).
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
              className={`flex h-11 items-center rounded-full border p-1 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
                pressed ? 'border-white/70 bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/70'
              }`}
            >
              <span
                className={`${color} flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-base font-medium tracking-wide text-white`}
              >
                <span className="sr-only">Línea </span>
                {line}
              </span>
              <span
                className={`flex justify-center overflow-hidden transition-all duration-300 ease-spring motion-reduce:transition-none ${
                  pressed ? 'w-7 opacity-100' : 'w-1 opacity-0'
                }`}
                aria-hidden="true"
              >
                <Check
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-spring ${pressed ? 'scale-100' : 'scale-50'}`}
                  strokeWidth={3}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
