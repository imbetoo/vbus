import { Check } from 'lucide-react';
import { useId } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';
import { useT } from '../../i18n';
import { PALETTES } from '../../lib/appearance';
import { haptics } from '../../lib/haptics';
import { PRESSABLE } from '../ui/pressable';

// Mini "mesh" de la muestra: las cuatro manchas de color sobre el lienzo (sin
// la banda perla central, que las igualaría todas). Lee las mismas variables
// que el fondo de verdad, que la muestra recibe de su propio `data-palette`
// (`index.css`): los colores están en un solo sitio.
const blob = (n, at, size) => `radial-gradient(circle at ${at}, rgb(var(--mesh-${n})) 0 ${size}, rgb(var(--mesh-${n}) / 0) 80%)`;
const SWATCH_STYLE = {
  background: [
    blob(1, '15% 15%', '22%'),
    blob(2, '90% 25%', '22%'),
    blob(3, '20% 95%', '22%'),
    blob(4, '90% 90%', '20%'),
    'rgb(var(--mesh-canvas))',
  ].join(', '),
};

/**
 * Selector de paleta (ajuste "Tema"): cuadrícula de muestras circulares, cada
 * una con un mini fondo de su paleta y su nombre debajo. La elegida lleva un
 * anillo blanco y un check. Accesible como grupo de radios (Tab + flechas);
 * cada cambio da un toque háptico ligero.
 */
export default function PalettePicker({ value, onChange }) {
  const t = useT();
  const labelId = useId();
  const index = Math.max(
    0,
    PALETTES.findIndex((palette) => palette.id === value),
  );
  const select = (i) => {
    const next = PALETTES[i].id;
    if (next === value) return;
    haptics.select();
    onChange(next);
  };
  const itemProps = useRadioGroup(PALETTES.length, index, select);

  return (
    <div>
      <span id={labelId} className="sr-only">
        {t('settings.theme')}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-x-2 gap-y-3">
        {PALETTES.map((palette, i) => {
          const selected = i === index;
          return (
            <button
              key={palette.id}
              type="button"
              aria-label={
                palette.scheme
                  ? t(palette.scheme === 'dark' ? 'palette.alwaysDark' : 'palette.alwaysLight', { name: t(`palette.${palette.id}`) })
                  : t(`palette.${palette.id}`)
              }
              {...itemProps(i)}
              onClick={() => select(i)}
              className={`group flex flex-col items-center gap-1.5 rounded-2xl py-1 focus-visible:outline-none ${PRESSABLE}`}
            >
              <span
                data-palette={palette.id}
                style={SWATCH_STYLE}
                className={`flex h-12 w-12 items-center justify-center rounded-full shadow-relief transition-transform duration-300 ease-spring group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-graphite motion-reduce:transition-none ${
                  selected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#333]' : 'ring-1 ring-inset ring-white/15'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
                    selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </span>
              <span className={`text-xs font-medium ${selected ? 'text-white' : 'text-white/60'}`}>{t(`palette.${palette.id}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
