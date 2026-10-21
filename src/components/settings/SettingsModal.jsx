import { X } from 'lucide-react';
import { useId } from 'react';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';

/** Menú flotante de ajustes. De momento solo anuncia que llegará. */
export default function SettingsModal({ open, onClose }) {
  const titleId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className="aspect-square w-[60vw] min-w-[280px] max-w-sm"
    >
      <div className="flex h-full flex-col p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
            Ajustes
          </h2>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </header>
        <p className="flex flex-1 items-center justify-center text-center text-base font-medium text-white/60">
          Próximamente
        </p>
        <PillButton onClick={onClose}>Hecho</PillButton>
      </div>
    </Modal>
  );
}
