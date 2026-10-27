import { Download, Share, X } from 'lucide-react';
import { useId } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import SegmentedControl from '../ui/SegmentedControl';
import { PRESSABLE } from '../ui/pressable';

const SORT_OPTIONS = [
  { value: 'time', label: 'Llegada' },
  { value: 'preference', label: 'Preferencia' },
];

const BACKGROUND_OPTIONS = [
  { value: 'full', label: 'Completo' },
  { value: 'lite', label: 'Ligero' },
];

/** Una fila de ajuste en un contenedor Bento: título, explicación y control. */
function SettingRow({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
      <div className={`mt-0.5 text-sm font-medium text-white/60 ${children ? 'mb-3' : ''}`}>{description}</div>
      {children}
    </section>
  );
}

/** Menú flotante de ajustes: afecta a cómo se pintan todas las tarjetas. */
export default function SettingsModal({ open, onClose, settings, onChange }) {
  const titleId = useId();
  const { canInstall, install, iosHint } = useInstallPrompt();

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
          title="Ordenar autobuses por"
          description={
            // `key`: al cambiar de opción, la explicación nueva entra con un fundido.
            <span key={settings.sortBy} className="block animate-fade-in motion-reduce:animate-none">
              {settings.sortBy === 'time'
                ? 'El que llega antes, primero.'
                : 'Tus líneas en el orden en que las elegiste.'}
            </span>
          }
        >
          <SegmentedControl
            label="Ordenar autobuses por"
            options={SORT_OPTIONS}
            value={settings.sortBy}
            onChange={(value) => onChange('sortBy', value)}
          />
        </SettingRow>

        <SettingRow
          title="Fondo"
          description={
            <span key={settings.background} className="block animate-fade-in motion-reduce:animate-none">
              {settings.background === 'full'
                ? 'Cinco manchas de color en movimiento.'
                : 'Solo tres manchas: más fluido si notas tirones.'}
            </span>
          }
        >
          <SegmentedControl
            label="Fondo"
            options={BACKGROUND_OPTIONS}
            value={settings.background}
            onChange={(value) => onChange('background', value)}
          />
        </SettingRow>

        {/* Solo aparece si el navegador permite instalarla (o en iOS, cómo hacerlo). */}
        {canInstall && (
          <SettingRow title="Instalar app" description="Ábrela a pantalla completa desde tu pantalla de inicio.">
            <button
              type="button"
              onClick={install}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 text-base font-semibold active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              Instalar VigoBus
            </button>
          </SettingRow>
        )}
        {iosHint && (
          <SettingRow
            title="Instalar app"
            description={
              <>
                En Safari, pulsa <Share className="inline h-4 w-4 align-[-2px]" aria-label="Compartir" /> y
                luego «Añadir a pantalla de inicio».
              </>
            }
          />
        )}

        <PillButton onClick={onClose} className="mt-1">
          Hecho
        </PillButton>
      </div>
    </Modal>
  );
}
