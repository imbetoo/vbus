import { PRESSABLE } from '../ui/pressable';

/**
 * Selector múltiple de líneas en pastillas de cristal. `selected` guarda el
 * orden en que se eligieron (la prioridad): cada pastilla elegida muestra su
 * número (1, 2, 3…) en un círculo del mismo alto que el distintivo de la
 * línea, así el margen interior queda igual a ambos lados. El círculo crece
 * desde ancho 0, de modo que las pastillas sin elegir quedan compactas.
 */
export default function LineChips({ lines, selected, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {lines.map(({ line, color }) => {
        const priority = selected.indexOf(line) + 1;
        const pressed = priority > 0;

        return (
          <li key={line}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggle(line)}
              className={`flex items-center rounded-full border p-1 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
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
                className={`flex h-9 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-semibold tabular-nums text-black transition-all duration-300 ease-spring motion-reduce:transition-none ${
                  pressed ? 'ml-1 w-9 opacity-100' : 'ml-0 w-0 opacity-0'
                }`}
              >
                {pressed && (
                  <>
                    <span className="sr-only">, prioridad </span>
                    {priority}
                  </>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
