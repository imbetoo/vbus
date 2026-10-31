import { Check } from 'lucide-react';
import { useId } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';
import { CARD_COLORS } from '../bus/cardColors';
import { PRESSABLE } from '../ui/pressable';
import { useT } from '../../i18n';

/**
 * Selector de color a medida: una fila de círculos con relieve (sin
 * `<input type="color">`). El elegido crece un poco, lleva un anillo blanco y
 * un check. Accesible como grupo de radios (Tab + flechas).
 */
export default function ColorPicker({ value, onChange }) {
  const t = useT();
  const labelId = useId();
  const index = Math.max(
    0,
    CARD_COLORS.findIndex((color) => color.id === value),
  );
  const itemProps = useRadioGroup(CARD_COLORS.length, index, (i) => onChange(CARD_COLORS[i].id));

  return (
    <div>
      <p id={labelId} className="mb-2 text-sm font-semibold text-white/80">
        {t('color.label')}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-8 gap-2">
        {CARD_COLORS.map((color, i) => {
          const selected = i === index;
          return (
            <button
              key={color.id}
              type="button"
              aria-label={t(`color.${color.id}`)}
              {...itemProps(i)}
              onClick={() => onChange(color.id)}
              className={`${color.bg} ${color.icon} flex aspect-square w-full items-center justify-center rounded-full shadow-relief focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-graphite ${PRESSABLE} ${
                selected
                  ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#333]'
                  : 'ring-1 ring-inset ring-white/15'
              }`}
            >
              <Check
                className={`h-4 w-4 transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
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
