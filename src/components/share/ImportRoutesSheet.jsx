import { Inbox } from 'lucide-react';
import { useId, useState } from 'react';
import { newCards } from '../../lib/routesShare';
import IconHeading from '../ui/IconHeading';
import PillButton from '../ui/PillButton';
import Sheet from '../ui/Sheet';
import { PRESSABLE } from '../ui/pressable';
import RoutesPreview from './RoutesPreview';

const plural = (n) => `${n} ${n === 1 ? 'ruta' : 'rutas'}`;

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
  const titleId = useId();
  // Lo último sigue pintado mientras la hoja baja.
  const [shown, setShown] = useState(entries);
  if (entries && entries !== shown) setShown(entries);
  const list = shown ?? [];
  const fresh = newCards(routes, list).length;
  const repeated = list.length - fresh;

  let addHint = `Se ${fresh === 1 ? 'añade' : 'añaden'} ${plural(fresh)} al final de las tuyas.`;
  if (!fresh) addHint = 'Ya tienes todas estas rutas: no se añadirá ninguna.';
  else if (repeated) addHint = `Se ${fresh === 1 ? 'añade' : 'añaden'} ${plural(fresh)} (${repeated} ya ${repeated === 1 ? 'la tenías' : 'las tenías'}).`;

  return (
    <Sheet open={Boolean(entries)} onClose={onCancel} labelledBy={titleId}>
      <IconHeading
        icon={Inbox}
        iconStrokeWidth={2.5}
        title="Colección de rutas recibida"
        subtitle={`${plural(list.length)} de otro móvil`}
        titleAs="h2"
        titleId={titleId}
      />

      <div className="mt-5">
        <RoutesPreview entries={list} />
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <PillButton onClick={() => onChoose('merge')} disabled={!fresh}>
          Añadir a mis rutas
        </PillButton>
        <p className="px-2 text-center text-sm font-medium text-white/60">{addHint}</p>
        {routes.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => onChoose('replace')}
              className={`mt-1 flex h-14 w-full items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              Reemplazar mis rutas
            </button>
            <p className="px-2 text-center text-sm font-medium text-white/60">
              {routes.length === 1 ? 'Se borrará tu ruta actual.' : `Se borrarán tus ${routes.length} rutas actuales.`}
            </p>
          </>
        )}
        <button
          type="button"
          onClick={onCancel}
          className={`mt-2 flex h-14 w-full items-center justify-center rounded-full bg-white/[0.06] text-lg font-semibold text-urgent active:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-urgent ${PRESSABLE}`}
        >
          Cancelar
        </button>
      </div>
    </Sheet>
  );
}
