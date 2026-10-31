import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { loadStopsList, stopLines } from '../../data/stops';
import { NOTE_MAX, lineColor } from '../../services/vigobusAdapter';
import CardNameField from '../create-card/CardNameField';
import LineChips from '../create-card/LineChips';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';

/**
 * "Editar tarjeta" (lápiz del modo edición):
 * - Alias: "Trabajo 💻". Vacío = sin alias, y la tarjeta vuelve a llamarse
 *   como la parada.
 * - Líneas: todas las que pasan por la parada (datos abiertos del Concello,
 *   más las que ya tenía la tarjeta) como pastillas: encendidas se muestran en
 *   la tarjeta, en el orden en que se tocaron (su prioridad); apagadas, la
 *   tarjeta no las enseña. Al menos una.
 * `route` es la tarjeta que se edita (o `null` con el modal cerrado).
 * - Nota: opcional, hasta 60 caracteres ("Coger el de las 8:10").
 * `onSave(id, { alias, note, lines })`.
 */
export default function EditCardModal({ route, onClose, onSave }) {
  const titleId = useId();

  return (
    <Modal open={Boolean(route)} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      {/* `key`: el formulario empieza con los datos de la tarjeta que se abre. */}
      {route && <EditCardForm key={route.id} route={route} titleId={titleId} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function EditCardForm({ route, titleId, onClose, onSave }) {
  const [alias, setAlias] = useState(route.alias ?? '');
  const [note, setNote] = useState(route.note ?? '');
  const [visible, setVisible] = useState(route.lines ?? []);
  const hintId = useId();
  const linesHintId = useId();

  // Líneas de la parada según los datos abiertos (se cargan al abrir).
  const [stopLinesLoaded, setStopLinesLoaded] = useState(() => stopLines(route.stopId));
  useEffect(() => {
    let alive = true;
    loadStopsList()
      .then(() => alive && setStopLinesLoaded(stopLines(route.stopId)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [route.stopId]);
  const allLines = [
    ...new Set([...(route.lines ?? []), ...stopLinesLoaded, ...(route.buses ?? []).map((bus) => bus.line)]),
  ];

  // Al abrirse, `<dialog>` enfoca su primer botón (la X): el foco se pasa al
  // campo justo después, para escribir el alias directamente.
  const inputRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, []);

  const toggleLine = (line) =>
    setVisible((current) => (current.includes(line) ? current.filter((l) => l !== line) : [...current, line]));

  return (
    // Con muchas líneas puede no caber en pantalla: hace scroll.
    <form
      className="flex max-h-[calc(100dvh-2rem)] transform-gpu flex-col gap-4 overflow-y-auto overscroll-contain p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (visible.length) onSave(route.id, { alias, note, lines: visible });
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
          Editar tarjeta
        </h2>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <CardNameField
          label="Alias"
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
        <div className="mt-4">
          <CardNameField
            label="Nota"
            value={note}
            onChange={setNote}
            placeholder="Opcional · Ej. Coger el de las 8:10"
            maxLength={NOTE_MAX}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4" aria-describedby={linesHintId}>
        <h3 className="mb-3 text-sm font-semibold text-white/80">Líneas</h3>
        <LineChips
          lines={allLines.map((line) => ({ line, color: lineColor(line) }))}
          selected={visible}
          onToggle={toggleLine}
        />
        <p
          id={linesHintId}
          key={visible.length ? 'ok' : 'empty'}
          className={`mt-3 animate-fade-in text-sm font-medium motion-reduce:animate-none ${
            visible.length ? 'text-white/60' : 'text-red-300'
          }`}
        >
          {visible.length
            ? 'Solo se ven las líneas marcadas, en el orden en que las tocaste.'
            : 'Marca al menos una línea.'}
        </p>
      </section>

      <PillButton type="submit" disabled={!visible.length} className="mt-1">
        Guardar
      </PillButton>
    </form>
  );
}
