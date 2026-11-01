import { useId } from 'react';
import { useT } from '../../i18n';
import { CARD_SLOTS } from '../../lib/cardSlots';
import SegmentedControl from '../ui/SegmentedControl';

/**
 * "¿Cuándo la usas?": momento del día en que la tarjeta sube arriba
 * (orden inteligente por hora). Siempre, Mañana, Tarde o Noche.
 */
export default function SlotPicker({ value, onChange }) {
  const t = useT();
  const hintId = useId();
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/80" aria-hidden="true">
        {t('slot.title')}
      </p>
      <SegmentedControl
        label={t('slot.title')}
        options={CARD_SLOTS.map((slot) => ({ value: slot, label: t(`slot.short.${slot}`), title: t(`slot.${slot}`) }))}
        value={value}
        onChange={onChange}
        compact
      />
      <p id={hintId} key={value} className="mt-2 animate-fade-in text-sm font-medium text-white/60 motion-reduce:animate-none">
        {t(value === 'any' ? 'slot.hint.any' : 'slot.hint', { when: t(`slot.range.${value}`) })}
      </p>
    </div>
  );
}
