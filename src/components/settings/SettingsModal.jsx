import { X } from 'lucide-react';
import { useId } from 'react';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import SegmentedControl from '../ui/SegmentedControl';

const BUSES_OPTIONS = [
  { value: 2, label: '2' },
  { value: 3, label: '3' },
];

const SORT_OPTIONS = [
  { value: 'time', label: 'Llegada' },
  { value: 'preference', label: 'Preferencia' },
];

/** Una fila de ajuste en un contenedor Bento: título, explicación y control. */
function SettingRow({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mb-3 mt-0.5 text-sm font-medium text-white/60">{description}</p>
      {children}
    </section>
  );
}

/** Menú flotante de ajustes: afecta a cómo se pintan todas las tarjetas. */
export default function SettingsModal({ open, onClose, settings, onChange }) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      <div className="flex flex-col gap-4 p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
            Ajustes
          </h2>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </header>

        <SettingRow
          title="Autobuses visibles"
          description="Cuántos se ven en cada tarjeta antes de «Ver más autobuses»."
        >
          <SegmentedControl
            label="Autobuses visibles por defecto"
            options={BUSES_OPTIONS}
            value={settings.busesToShow}
            onChange={(value) => onChange('busesToShow', value)}
          />
        </SettingRow>

        <SettingRow
          title="Ordenar autobuses por"
          description={
            settings.sortBy === 'time'
              ? 'El que llega antes, primero.'
              : 'Tus líneas en el orden en que las elegiste.'
          }
        >
          <SegmentedControl
            label="Ordenar autobuses por"
            options={SORT_OPTIONS}
            value={settings.sortBy}
            onChange={(value) => onChange('sortBy', value)}
          />
        </SettingRow>

        <PillButton onClick={onClose} className="mt-1">
          Hecho
        </PillButton>
      </div>
    </Modal>
  );
}
