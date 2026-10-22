import { useId, useRef } from 'react';

/**
 * Control segmentado estilo iOS: una píldora de cristal con un "pulgar"
 * blanco que se desliza (solo `transform`, curva `ease-spring`) hasta la
 * opción elegida. Accesible como grupo de radios: Tab entra en la opción
 * elegida y las flechas cambian de opción.
 */
export default function SegmentedControl({ label, options, value, onChange }) {
  const labelId = useId();
  const refs = useRef([]);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const select = (next) => {
    const wrapped = (next + options.length) % options.length;
    onChange(options[wrapped].value);
    refs.current[wrapped]?.focus();
  };

  return (
    <div>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="relative grid rounded-full border border-white/10 bg-white/10 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 rounded-full bg-white shadow-md shadow-black/20 transition-transform duration-[400ms] ease-spring motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {options.map((option, i) => {
          const checked = i === index;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  select(i + 1);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  select(i - 1);
                }
              }}
              className={`relative z-10 h-9 truncate rounded-full px-3 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                checked ? 'text-black' : 'text-white/70 active:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
