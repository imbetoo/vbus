import { X } from 'lucide-react';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';

/** Menú flotante de ajustes. De momento solo anuncia que llegará. */
export default function SettingsModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Ajustes"
      className="aspect-square w-[60vw] min-w-[260px] max-w-sm"
    >
      <div className="relative flex h-full items-center justify-center p-6">
        <IconButton icon={X} label="Cerrar" onClick={onClose} className="absolute right-4 top-4" />
        <p className="text-center text-lg font-medium text-white/60">Ajustes (Próximamente)</p>
      </div>
    </Modal>
  );
}
