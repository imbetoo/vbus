import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import CardNameField from '../create-card/CardNameField';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';

/**
 * Modal pequeño para poner (o quitar) el alias de una tarjeta: "Trabajo 💻".
 * Vacío = sin alias, y la tarjeta vuelve a llamarse como la parada.
 * `route` es la tarjeta que se edita (o `null` con el modal cerrado).
 */
export default function AliasModal({ route, onClose, onSave }) {
  const titleId = useId();

  return (
    <Modal open={Boolean(route)} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      {/* `key`: el formulario empieza con el alias de la tarjeta que se abre. */}
      {route && <AliasForm key={route.id} route={route} titleId={titleId} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function AliasForm({ route, titleId, onClose, onSave }) {
  const [alias, setAlias] = useState(route.alias ?? '');
  const hintId = useId();
  // Al abrirse, `<dialog>` enfoca su primer botón (la X): el foco se pasa al
  // campo justo después, para escribir el alias directamente.
  const inputRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <form
      className="flex flex-col gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(route.id, alias);
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
          Alias
        </h2>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <CardNameField
          label="Nombre de la tarjeta"
          value={alias}
          onChange={setAlias}
          placeholder={route.stopName || 'Ej. Trabajo 💻'}
          describedBy={hintId}
          inputRef={inputRef}
        />
        <p id={hintId} className="mt-2 text-sm font-medium text-white/60">
          {route.stopName ? `Parada ${route.stopId} · ${route.stopName}. ` : ''}Déjalo vacío para usar el nombre de
          la parada.
        </p>
      </section>

      <PillButton type="submit" className="mt-1">
        Guardar
      </PillButton>
    </form>
  );
}
