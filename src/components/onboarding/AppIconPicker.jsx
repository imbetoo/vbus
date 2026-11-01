import { Check, ChevronLeft } from 'lucide-react';
import { useId, useState } from 'react';
import { useRadioGroup } from '../../hooks/useRadioGroup';
import { useT } from '../../i18n';
import { EXTRA_APP_ICONS, MAIN_APP_ICONS, appIconPreview } from '../../lib/appIcon';
import { haptics } from '../../lib/haptics';
import Collapse from '../ui/Collapse';
import { PRESSABLE } from '../ui/pressable';

/**
 * Icono de la app para la pantalla de inicio (bienvenida y Ajustes): las
 * variantes como iconos de verdad (su SVG, con su forma redondeada), con su
 * nombre debajo. La elegida lleva un anillo blanco y un check. Grupo de
 * radios (Tab + flechas); cada cambio da un toque háptico ligero.
 *
 * A la vista, las tres principales y una flecha pequeña ("Más iconos"): al
 * tocarla gira hacia abajo y despliega (`Collapse`) una rejilla de 3 × 2 con
 * el resto, separada por una línea. Empieza desplegada si la elegida está
 * entre ellas. Las flechas del teclado recorren solo las que se ven.
 * `size`: lado de cada icono en px.
 */
export default function AppIconPicker({ value, onChange, size = 64 }) {
  const t = useT();
  const labelId = useId();
  const moreId = useId();
  const [open, setOpen] = useState(() => EXTRA_APP_ICONS.includes(value));
  const visible = open ? [...MAIN_APP_ICONS, ...EXTRA_APP_ICONS] : MAIN_APP_ICONS;
  const index = Math.max(0, visible.indexOf(value));
  const select = (i) => {
    if (visible[i] === value) return;
    haptics.select();
    onChange(visible[i]);
  };
  const itemProps = useRadioGroup(visible.length, index, select);

  const renderIcon = (id, i) => {
    const selected = id === value;
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
  };

  return (
    <div>
      <span id={labelId} className="sr-only">
        {t('appIcon.label')}
      </span>
      <div role="radiogroup" aria-labelledby={labelId}>
        <div className="flex items-center justify-center gap-6 max-[379px]:gap-4">
          {MAIN_APP_ICONS.map((id, i) => renderIcon(id, i))}
          {/* Desplegable de más iconos: flecha a la izquierda; abierto, hacia abajo. */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={moreId}
            aria-label={t(open ? 'appIcon.less' : 'appIcon.more')}
            onClick={() => setOpen((current) => !current)}
            className={`-mr-1 mb-6 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 after:absolute after:-inset-2.5 after:content-[''] relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ease-spring motion-reduce:transition-none ${open ? '-rotate-90' : ''}`}
              strokeWidth={2.75}
              aria-hidden="true"
            />
          </button>
        </div>
        <Collapse id={moreId} open={open}>
          <div className="mt-4 grid grid-cols-3 justify-items-center gap-y-4 border-t border-white/10 pt-4">
            {EXTRA_APP_ICONS.map((id, i) => renderIcon(id, MAIN_APP_ICONS.length + i))}
          </div>
        </Collapse>
      </div>
    </div>
  );
}
