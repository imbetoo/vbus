import { Check } from 'lucide-react';
import { useId } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';
import { useT } from '../../i18n';
import { APP_ICONS, appIconPreview } from '../../lib/appIcon';
import { haptics } from '../../lib/haptics';
import { PRESSABLE } from '../ui/pressable';

/**
 * Icono de la app para la pantalla de inicio (bienvenida y Ajustes): las
 * variantes como iconos de verdad (su SVG, con su forma redondeada), con su
 * nombre debajo. La elegida lleva un anillo blanco y un check. Grupo de
 * radios (Tab + flechas); cada cambio da un toque háptico ligero.
 * `size`: lado de cada icono en px.
 */
export default function AppIconPicker({ value, onChange, size = 64 }) {
  const t = useT();
  const labelId = useId();
  const index = Math.max(0, APP_ICONS.indexOf(value));
  const select = (i) => {
    if (APP_ICONS[i] === value) return;
    haptics.select();
    onChange(APP_ICONS[i]);
  };
  const itemProps = useRadioGroup(APP_ICONS.length, index, select);

  return (
    <div>
      <span id={labelId} className="sr-only">
        {t('appIcon.label')}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex justify-center gap-6">
        {APP_ICONS.map((id, i) => {
          const selected = i === index;
          return (
            <button
              key={id}
              type="button"
              aria-label={t(`appIcon.${id}`)}
              {...itemProps(i)}
              onClick={() => select(i)}
              className={`group flex flex-col items-center gap-2 rounded-2xl focus-visible:outline-none ${PRESSABLE}`}
            >
              <span
                className={`relative block rounded-[22%] transition-transform duration-300 ease-spring group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-graphite motion-reduce:transition-none ${
                  selected ? 'scale-105 ring-2 ring-white ring-offset-[3px] ring-offset-graphite' : ''
                }`}
                style={{ width: size, height: size }}
              >
                <img src={appIconPreview(id)} alt="" width={size} height={size} className="block h-full w-full" draggable="false" />
                <span
                  className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-md transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
                    selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </span>
              <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-white/60'}`}>{t(`appIcon.${id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
