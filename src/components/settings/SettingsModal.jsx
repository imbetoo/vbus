import { Download, Share, X } from 'lucide-react';
import { useId } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { MOTIONS, applyAppearance, changeAppearance } from '../../lib/appearance';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import SegmentedControl from '../ui/SegmentedControl';
import Switch from '../ui/Switch';
import PalettePicker from './PalettePicker';
import { PRESSABLE } from '../ui/pressable';

// "vBus v1.20 • Build: 29/10/2026, 22:45 · 4c8e5b7" (versión de
// package.json sin el parche, hora de Vigo y commit).
const BUILD_LABEL = (() => {
  const { version, time, commit } = __BUILD_INFO__;
  const [major = '1', minor = '0'] = String(version ?? '').split('.');
  const date = new Date(time).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `vBus v${major}.${minor} • Build: ${date}${commit ? ` · ${commit}` : ''}`;
})();

const SORT_OPTIONS = [
  { value: 'time', label: 'Llegada' },
  { value: 'preference', label: 'Preferencia' },
];

const TIME_FORMAT_OPTIONS = [
  { value: 'relative', label: 'Relativo' },
  { value: 'absolute', label: 'Absoluto' },
];

const REFRESH_OPTIONS = [
  { value: 15, label: '15 s' },
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
];

const BACKGROUND_OPTIONS = [
  { value: 'full', label: 'Completo' },
  { value: 'lite', label: 'Ligero' },
];

// Explicación de la paleta elegida (las que fijan el modo lo dicen).
const PALETTE_HINTS = {
  vigo: 'Azules y morados: el de siempre.',
  nature: 'Esmeralda, menta y bosque.',
  sunset: 'Naranjas, rojos y amarillos cálidos.',
  ocean: 'Azul marino, turquesa y cian.',
  cyberpunk: 'Magenta y cian neón. Siempre en modo oscuro.',
  lavender: 'Lilas y rosas pastel, relajante.',
  cloud: 'Blancos y grises, sin color. Siempre en modo claro.',
  shadow: 'Grises muy oscuros y carbón. Siempre en modo oscuro.',
  oled: 'Negro puro y sin animación: ahorra batería. Siempre en modo oscuro.',
};

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

/** Fila Bento con interruptor a la derecha del título (ajustes de sí/no). */
function SwitchRow({ title, description, checked, onChange }) {
  const descriptionId = useId();
  return (
    <section className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
        <div id={descriptionId} className="mt-0.5 text-sm font-medium text-white/60">
          {description}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} describedBy={descriptionId} />
    </section>
  );
}

/** Menú flotante de ajustes: afecta a cómo se pintan todas las tarjetas. */
export default function SettingsModal({ open, onClose, settings, onChange }) {
  const titleId = useId();
  const { canInstall, install, iosHint } = useInstallPrompt();

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      {/* Con todos los ajustes puede no caber en un móvil apaisado: hace scroll. */}
      <div className="flex max-h-[calc(100dvh-2rem)] transform-gpu flex-col gap-4 overflow-y-auto overscroll-contain p-5">
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

        <SwitchRow
          title="Ordenar tarjetas por cercanía"
          description={
            <span key={String(settings.sortByProximity)} className="block animate-fade-in motion-reduce:animate-none">
              {settings.sortByProximity
                ? 'La tarjeta de la parada que tienes más cerca sale la primera. Tu orden no se pierde.'
                : 'Siempre en el orden en que las colocaste.'}
            </span>
          }
          checked={settings.sortByProximity}
          onChange={(value) => onChange('sortByProximity', value)}
        />

        <SwitchRow
          title="Vibración"
          description={
            <span key={String(settings.vibration)} className="block animate-fade-in motion-reduce:animate-none">
              {settings.vibration
                ? 'Toques al usar la app y vibración fuerte en los avisos.'
                : 'Sin vibración. Los avisos siguen sonando y notificando.'}
            </span>
          }
          checked={settings.vibration}
          onChange={(value) => onChange('vibration', value)}
        />

        <SettingRow
          title="Formato de tiempo"
          description={
            <span key={settings.timeFormat} className="block animate-fade-in motion-reduce:animate-none">
              {settings.timeFormat === 'relative'
                ? 'Lo que falta para que llegue: «5 min».'
                : 'La hora a la que llega: «12:45».'}
            </span>
          }
        >
          <SegmentedControl
            label="Formato de tiempo"
            options={TIME_FORMAT_OPTIONS}
            value={settings.timeFormat}
            onChange={(value) => onChange('timeFormat', value)}
          />
        </SettingRow>

        <SettingRow
          title="Actualizar datos"
          description={
            <span key={settings.refreshSeconds} className="block animate-fade-in motion-reduce:animate-none">
              {settings.refreshSeconds === 15
                ? 'Cada 15 segundos: lo más al día, gasta algo más de datos.'
                : settings.refreshSeconds === 30
                  ? 'Cada 30 segundos (recomendado).'
                  : 'Cada minuto: gasta menos datos y batería.'}
            </span>
          }
        >
          <SegmentedControl
            label="Actualizar datos"
            options={REFRESH_OPTIONS}
            value={settings.refreshSeconds}
            onChange={(value) => onChange('refreshSeconds', value)}
          />
        </SettingRow>

        <SettingRow
          title="Tema"
          description={
            <span key={settings.palette} className="block animate-fade-in motion-reduce:animate-none">
              {PALETTE_HINTS[settings.palette] ?? 'Colores del fondo y de los acentos.'}
            </span>
          }
        >
          <PalettePicker
            value={settings.palette}
            // Fondo, acentos y modo cambian a la vez con un fundido (solo atributos de <html>).
            onChange={(palette) => changeAppearance({ palette }, () => onChange('palette', palette))}
          />
        </SettingRow>

        <SettingRow
          title="Dinamismo"
          description={
            <span key={settings.motion} className="block animate-fade-in motion-reduce:animate-none">
              {settings.motion === 'fluid'
                ? 'Movimiento vivo, el doble de rápido.'
                : settings.motion === 'relaxed'
                  ? 'Movimiento lento y sutil (recomendado).'
                  : 'Fondo congelado: 0 % de CPU y de batería.'}
            </span>
          }
        >
          <SegmentedControl
            label="Dinamismo"
            options={MOTIONS}
            value={settings.motion}
            onChange={(motion) => {
              applyAppearance({ motion });
              onChange('motion', motion);
            }}
          />
        </SettingRow>

        {/* Con OLED no hay manchas que aligerar. */}
        {settings.palette !== 'oled' && (
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
        )}

        {/* Solo aparece si el navegador permite instalarla (o en iOS, cómo hacerlo). */}
        {canInstall && (
          <SettingRow title="Instalar app" description="Ábrela a pantalla completa desde tu pantalla de inicio.">
            <button
              type="button"
              onClick={install}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 text-base font-semibold active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              Instalar vBus
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

        {/* Versión: si no coincide con la del último despliegue, el móvil está
            usando un build antiguo del caché (basta con cerrar y abrir la app). */}
        <p className="text-center text-xs font-medium tabular-nums text-white/40">{BUILD_LABEL}</p>
      </div>
    </Modal>
  );
}
