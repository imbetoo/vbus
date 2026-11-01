import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { loadStopsList, stopLines } from '../../data/stops';
import { useT } from '../../i18n';
import { NOTE_MAX, lineColor } from '../../services/vigobusAdapter';
import CardNameField from '../create-card/CardNameField';
import LineChips from '../create-card/LineChips';
import SlotPicker from '../create-card/SlotPicker';
import { cardSlot } from '../../lib/cardSlots';
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
 * `onSave(id, { alias, note, slot, lines })`.
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
  const t = useT();
  const [alias, setAlias] = useState(route.alias ?? '');
  const [note, setNote] = useState(route.note ?? '');
  const [slot, setSlot] = useState(() => cardSlot(route));
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
        if (visible.length) onSave(route.id, { alias, note, slot, lines: visible });
      }}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
          {t('edit.title')}
        </h2>
        <IconButton icon={X} label={t('common.close')} onClick={onClose} />
      </header>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <CardNameField
          label={t('edit.alias')}
          value={alias}
          onChange={setAlias}
          placeholder={route.stopName || t('edit.alias.placeholder')}
          describedBy={hintId}
          inputRef={inputRef}
        />
        <p id={hintId} className="mt-2 text-sm font-medium text-white/60">
          {route.stopName ? `${t('stop.fallback', { id: route.stopId })} · ${route.stopName}. ` : ''}
          {t('edit.alias.hint')}
        </p>
        <div className="mt-4">
          <CardNameField
            label={t('edit.note')}
            value={note}
            onChange={setNote}
            placeholder={t('edit.note.placeholder')}
            maxLength={NOTE_MAX}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <SlotPicker value={slot} onChange={setSlot} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4" aria-describedby={linesHintId}>
        <h3 className="mb-3 text-sm font-semibold text-white/80">{t('edit.lines')}</h3>
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
            ? t('edit.lines.hint')
            : t('edit.lines.empty')}
        </p>
      </section>

      <PillButton type="submit" disabled={!visible.length} className="mt-1">
        {t('common.save')}
      </PillButton>
    </form>
  );
}
