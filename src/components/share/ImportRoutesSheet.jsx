import { Inbox } from 'lucide-react';
import { useId, useState } from 'react';
import { newCards } from '../../lib/routesShare';
import IconHeading from '../ui/IconHeading';
import PillButton from '../ui/PillButton';
import Sheet from '../ui/Sheet';
import { PRESSABLE } from '../ui/pressable';
import RoutesPreview from './RoutesPreview';
import { useT } from '../../i18n';

/**
 * "Colección de rutas recibida" (hoja de acciones al estilo de iOS): al abrir
 * un enlace con tarjetas (`?tarjetas=`), lo que trae y qué hacer:
 * - "Añadir a mis rutas": las que no tengas ya (sin duplicados exactos).
 * - "Reemplazar mis rutas": solo si ya tienes alguna; borra las tuyas.
 * - "Cancelar" (rojo): no cambia nada. Escape, tocar fuera o deslizar abajo
 *   es lo mismo.
 *
 * `entries`: las tarjetas del enlace (`decodeRoutes`) o `null` (cerrada);
 * `routes`: las que ya tienes; `onChoose('merge' | 'replace')` y `onCancel`.
 */
export default function ImportRoutesSheet({ entries, routes, onChoose, onCancel }) {
  const t = useT();
  const titleId = useId();
  // Lo último sigue pintado mientras la hoja baja.
  const [shown, setShown] = useState(entries);
  if (entries && entries !== shown) setShown(entries);
  const list = shown ?? [];
  const fresh = newCards(routes, list).length;
  const repeated = list.length - fresh;

  let addHint = t('import.add.hint', { n: fresh });
  if (!fresh) addHint = t('import.add.none');
  else if (repeated) addHint = t('import.add.repeated', { n: fresh, r: repeated });

  return (
    <Sheet open={Boolean(entries)} onClose={onCancel} labelledBy={titleId}>
      <IconHeading
        icon={Inbox}
        iconStrokeWidth={2.5}
        title={t('import.title')}
        subtitle={t('import.subtitle', { n: list.length })}
        titleAs="h2"
        titleId={titleId}
      />

      <div className="mt-5">
        <RoutesPreview entries={list} />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <PillButton onClick={() => onChoose('merge')} disabled={!fresh}>
          {t('import.add')}
        </PillButton>
        <p className="px-2 text-center text-sm font-medium text-white/60">{addHint}</p>
        {routes.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => onChoose('replace')}
              className={`mt-1 flex h-14 w-full items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              {t('import.replace')}
            </button>
            <p className="px-2 text-center text-sm font-medium text-white/60">
              {t('import.replace.hint', { n: routes.length })}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          className={`mt-2 flex h-14 w-full items-center justify-center rounded-full bg-white/[0.06] text-lg font-semibold text-urgent active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-urgent ${PRESSABLE}`}
        >
          {t('common.cancel')}
        </button>
      </div>
    </Sheet>
  );
}
