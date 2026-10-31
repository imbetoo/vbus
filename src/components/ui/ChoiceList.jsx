import { Check } from 'lucide-react';
import { useId } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';

/**
 * Lista de opciones al estilo de iOS (como los sonidos o el idioma en
 * Ajustes): filas separadas por una línea fina dentro del contenedor Bento,
 * con nombre, descripción opcional y un ✓ en la elegida. Accesible como
 * grupo de radios (Tab + flechas).
 *
 * `options`: `[{ value, label, hint?, icon? }]`. `onSelect(value)` llega en
 * cada toque, también en la ya elegida (así se puede volver a escuchar un
 * tono); quien la use decide si es un cambio.
 */
export default function ChoiceList({ label, options, value, onSelect }) {
  const labelId = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const itemProps = useRadioGroup(options.length, index, (i) => onSelect(options[i].value));

  return (
    <div>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="-mx-1 divide-y divide-white/10">
        {options.map((option, i) => {
          const selected = i === index;
          return (
            <button
              key={option.value}
              type="button"
              {...itemProps(i)}
              onClick={() => onSelect(option.value)}
              className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors duration-200 active:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-base font-semibold">
                  {option.label}
                  {option.icon}
                </span>
                {option.hint && <span className="mt-0.5 block text-sm font-medium text-white/60">{option.hint}</span>}
              </span>
              <Check
                className={`h-5 w-5 shrink-0 text-accent transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
                  selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
                strokeWidth={3}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
