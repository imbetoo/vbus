import { useId } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';
import { haptics } from '../../lib/haptics';

/**
 * Control segmentado estilo iOS: una píldora de cristal con un "pulgar"
 * blanco que se desliza (solo `transform`, curva `ease-spring`) hasta la
 * opción elegida. Accesible como grupo de radios (Tab + flechas).
 */
export default function SegmentedControl({ label, options, value, onChange }) {
  const labelId = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  // Cambiar de opción da un toque háptico sutil (como los de iOS).
  const select = (next) => {
    if (next === value) return;
    haptics.select();
    onChange(next);
  };
  const itemProps = useRadioGroup(options.length, index, (i) => select(options[i].value));

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
        {options.map((option, i) => (
          <button
            key={option.value}
            type="button"
            {...itemProps(i)}
            onClick={() => select(option.value)}
            className={`relative z-10 h-9 truncate rounded-full px-3 text-sm font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              i === index ? 'text-black' : 'text-white/70 active:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
