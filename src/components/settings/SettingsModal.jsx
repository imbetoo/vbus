import { Download, QrCode, Share, X } from 'lucide-react';
import { Suspense, lazy, useId, useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { LANGUAGES, detectLanguage, useT } from '../../i18n';
import { MOTIONS, applyAppearance, changeAppearance } from '../../lib/appearance';
import { haptics } from '../../lib/haptics';
import { isStandalone } from '../../lib/platform';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import SegmentedControl from '../ui/SegmentedControl';
import ChoiceList from '../ui/ChoiceList';
import Switch from '../ui/Switch';
import AppIconPicker from '../onboarding/AppIconPicker';
import PalettePicker from './PalettePicker';
import TonePicker from './TonePicker';
import { PRESSABLE } from '../ui/pressable';

// El QR (y su generador) solo se descarga al abrirlo.
const ShareRoutesModal = lazy(() => import('../share/ShareRoutesModal'));

// "vBus v1.20 • Build: 29/10/2026, 22:45 · 4c8e5b7" (versión de
// package.json sin el parche, hora de Vigo y commit).
const BUILD_LABEL = (() => {
  const { version, time, commit } = __BUILD_INFO__;
  const [major = '1', minor = '0'] = String(version ?? '').split('.');
  // Formato fijo (día/mes/año, hora de Vigo): es un dato técnico, no un texto.
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

// Opciones de los controles segmentados: el valor y la clave de su texto.
const SORT_OPTIONS = ['time', 'preference'];
const TIME_FORMAT_OPTIONS = ['relative', 'absolute'];
const REFRESH_OPTIONS = [15, 30, 60];
const BACKGROUND_OPTIONS = ['full', 'lite'];

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
export default function SettingsModal({ open, onClose, settings, onChange, routes = [] }) {
  const t = useT();
  const titleId = useId();
  const { canInstall, install, iosHint } = useInstallPrompt();
  const installed = isStandalone();
  const autoLanguage = LANGUAGES.find((lang) => lang.id === detectLanguage())?.name;
  // "Compartir mis rutas guardadas": se monta la primera vez que se abre y se
  // queda montado para que también salga animado.
  const [sharing, setSharing] = useState(false);
  const [shareLoaded, setShareLoaded] = useState(false);
  const openShare = () => {
    setShareLoaded(true);
    setSharing(true);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      {/* Con todos los ajustes puede no caber en un móvil apaisado: hace scroll. */}
      <div className="flex max-h-[calc(100dvh-2rem)] transform-gpu flex-col gap-4 overflow-y-auto overscroll-contain p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
            {t('settings.title')}
          </h2>
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </header>

        <SettingRow
          title={t('settings.sortBy')}
          description={
            // `key`: al cambiar de opción, la explicación nueva entra con un fundido.
            <span key={settings.sortBy} className="block animate-fade-in motion-reduce:animate-none">
              {t(`settings.sortBy.${settings.sortBy}.hint`)}
            </span>
          }
        >
          <SegmentedControl
            label={t('settings.sortBy')}
            options={SORT_OPTIONS.map((value) => ({ value, label: t(`settings.sortBy.${value}`) }))}
            value={settings.sortBy}
            onChange={(value) => onChange('sortBy', value)}
          />
        </SettingRow>

        <SwitchRow
          title={t('settings.proximity')}
          description={
            <span key={String(settings.sortByProximity)} className="block animate-fade-in motion-reduce:animate-none">
              {t(settings.sortByProximity ? 'settings.proximity.on' : 'settings.proximity.off')}
            </span>
          }
          checked={settings.sortByProximity}
          onChange={(value) => onChange('sortByProximity', value)}
        />

        <SwitchRow
          title={t('settings.vibration')}
          description={
            <span key={String(settings.vibration)} className="block animate-fade-in motion-reduce:animate-none">
              {t(settings.vibration ? 'settings.vibration.on' : 'settings.vibration.off')}
            </span>
          }
          checked={settings.vibration}
          onChange={(value) => onChange('vibration', value)}
        />

        <SettingRow
          title={t('settings.timeFormat')}
          description={
            <span key={settings.timeFormat} className="block animate-fade-in motion-reduce:animate-none">
              {t(`settings.timeFormat.${settings.timeFormat}.hint`)}
            </span>
          }
        >
          <SegmentedControl
            label={t('settings.timeFormat')}
            options={TIME_FORMAT_OPTIONS.map((value) => ({ value, label: t(`settings.timeFormat.${value}`) }))}
            value={settings.timeFormat}
            onChange={(value) => onChange('timeFormat', value)}
          />
        </SettingRow>

        <SettingRow
          title={t('settings.refresh')}
          description={
            <span key={settings.refreshSeconds} className="block animate-fade-in motion-reduce:animate-none">
              {t(`settings.refresh.${settings.refreshSeconds}`)}
            </span>
          }
        >
          <SegmentedControl
            label={t('settings.refresh')}
            options={REFRESH_OPTIONS.map((value) => ({ value, label: `${value} s` }))}
            value={settings.refreshSeconds}
            onChange={(value) => onChange('refreshSeconds', value)}
          />
        </SettingRow>

        <SettingRow
          title={t('settings.theme')}
          description={
            <span key={settings.palette} className="block animate-fade-in motion-reduce:animate-none">
              {t(`palette.${settings.palette}.hint`)}
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
          title={t('settings.motion')}
          description={
            <span key={settings.motion} className="block animate-fade-in motion-reduce:animate-none">
              {t(`motion.${settings.motion}.hint`)}
            </span>
          }
        >
          <SegmentedControl
            label={t('settings.motion')}
            options={MOTIONS.map(({ value }) => ({ value, label: t(`motion.${value}`) }))}
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
            title={t('settings.background')}
            description={
              <span key={settings.background} className="block animate-fade-in motion-reduce:animate-none">
                {t(`settings.background.${settings.background}.hint`)}
              </span>
            }
          >
            <SegmentedControl
              label={t('settings.background')}
              options={BACKGROUND_OPTIONS.map((value) => ({ value, label: t(`settings.background.${value}`) }))}
              value={settings.background}
              onChange={(value) => onChange('background', value)}
            />
          </SettingRow>
        )}

        {/* Solo sin instalar: ya instalada, el sistema conserva su icono. */}
        {!installed && (
          <SettingRow title={t('appIcon.label')} description={t('appIcon.hint')}>
            <AppIconPicker value={settings.appIcon} onChange={(icon) => onChange('appIcon', icon)} size={56} />
          </SettingRow>
        )}

        <SettingRow title={t('settings.tone')} description={t('settings.tone.hint')}>
          <TonePicker value={settings.alarmTone} onChange={(tone) => onChange('alarmTone', tone)} />
        </SettingRow>

        <SettingRow
          title={t('settings.language')}
          description={
            <span key={settings.language} className="block animate-fade-in motion-reduce:animate-none">
              {settings.language === 'auto'
                ? t('settings.language.hint.auto', { name: autoLanguage })
                : t('settings.language.hint.manual')}
            </span>
          }
        >
          <ChoiceList
            label={t('settings.language')}
            value={settings.language}
            onSelect={(language) => {
              if (language === settings.language) return;
              haptics.select();
              onChange('language', language);
            }}
            options={[
              { value: 'auto', label: t('settings.language.auto'), hint: autoLanguage },
              ...LANGUAGES.map((lang) => ({ value: lang.id, label: lang.name })),
            ]}
          />
        </SettingRow>

        <SettingRow
          title={t('settings.share')}
          description={routes.length ? t('settings.share.hint') : t('settings.share.empty')}
        >
          {routes.length > 0 && (
            <button
              type="button"
              onClick={openShare}
              aria-haspopup="dialog"
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 text-base font-semibold active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              <QrCode className="h-[18px] w-[18px] text-accent" strokeWidth={2.5} aria-hidden="true" />
              {t('settings.share.button', { n: routes.length })}
            </button>
          )}
        </SettingRow>

        {/* Solo aparece si el navegador permite instalarla (o en iOS, cómo hacerlo). */}
        {canInstall && (
          <SettingRow title={t('settings.install')} description={t('settings.install.hint')}>
            <button
              type="button"
              onClick={install}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 text-base font-semibold active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              {t('settings.install.button')}
            </button>
          </SettingRow>
        )}
        {iosHint && (
          <SettingRow
            title={t('settings.install')}
            description={
              <>
                {t('settings.install.ios.before')}{' '}
                <Share className="inline h-4 w-4 align-[-2px]" aria-label={t('settings.install.ios.share')} />{' '}
                {t('settings.install.ios.after')}
              </>
            }
          />
        )}

        <PillButton onClick={onClose} className="mt-1">
          {t('common.done')}
        </PillButton>

        {/* Versión: si no coincide con la del último despliegue, el móvil está
            usando un build antiguo del caché (basta con cerrar y abrir la app). */}
        <p className="text-center text-xs font-medium tabular-nums text-white/40">{BUILD_LABEL}</p>
      </div>
      {shareLoaded && (
        <Suspense fallback={null}>
          <ShareRoutesModal open={open && sharing} onClose={() => setSharing(false)} routes={routes} />
        </Suspense>
      )}
    </Modal>
  );
}
