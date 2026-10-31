import { BellRing, BusFront, ChevronLeft, Download, Share, SquarePlus, WifiOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useT } from '../../i18n';
import { appIconPreview } from '../../lib/appIcon';
import { haptics } from '../../lib/haptics';
import { platform } from '../../lib/platform';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';
import AppIconPicker from './AppIconPicker';

const EXIT_MS = 300;

/**
 * Bienvenida al abrir vBus en el navegador (sin instalar) por primera vez,
 * al estilo de las presentaciones de Apple: pantalla completa, grafito y
 * opaca, en dos pasos.
 *
 * 1. Qué hace vBus y el icono para la pantalla de inicio (`AppIconPicker`):
 *    al elegir, cambian ya los `<link>` que leen los sistemas al instalar.
 * 2. Cómo instalarla según el sistema: en iPhone/iPad, Compartir → "Añadir a
 *    pantalla de inicio" (Safari no tiene botón propio); en Android y
 *    escritorio, el botón de verdad (`beforeinstallprompt`) o, si el
 *    navegador no lo ofrece, dónde está en su menú.
 *
 * "Saltar por ahora" (y Escape) la cierra para siempre (`onDone`, que pone
 * `vbus:onboarded`), igual que terminarla o instalar.
 */
export default function OnboardingScreen({ open, appIcon, onAppIconChange, onDone }) {
  const ref = useRef(null);
  const titleId = useId();
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open, onClose: onDone, exitMs: EXIT_MS });

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...dialogProps}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-graphite p-0 text-white opacity-0 transform-gpu transition-opacity duration-300 ease-spring will-change-[opacity] backdrop:bg-black data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      {mounted && <Onboarding titleId={titleId} appIcon={appIcon} onAppIconChange={onAppIconChange} onDone={onDone} />}
    </dialog>
  );
}

function Onboarding({ titleId, appIcon, onAppIconChange, onDone }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const system = platform();

  // Instalada por cualquier vía (también desde la barra del navegador): listo.
  useEffect(() => {
    window.addEventListener('appinstalled', onDone);
    return () => window.removeEventListener('appinstalled', onDone);
  }, [onDone]);

  const installNow = async () => {
    haptics.impact();
    const outcome = await install();
    if (outcome === 'accepted') onDone();
    else if (outcome === 'dismissed') setDismissed(true);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
      {/* Arriba: volver (paso 2) y los puntos de los pasos. */}
      <div className="relative flex h-10 shrink-0 items-center justify-center">
        {step === 1 && (
          <button
            type="button"
            onClick={() => setStep(0)}
            className={`absolute left-0 flex h-10 items-center gap-0.5 rounded-full pr-3 text-base font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {t('onboarding.back')}
          </button>
        )}
        <div className="flex gap-2" role="img" aria-label={t('onboarding.step', { n: step + 1, total: 2 })}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-[width,background-color] duration-300 ease-spring motion-reduce:transition-none ${
                i === step ? 'w-6 bg-white' : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* `key`: cada paso entra con un fundido. */}
      <div key={step} className="scroll-fade -mx-6 min-h-0 flex-1 animate-fade-in overflow-y-auto overscroll-contain px-6 pb-6 pt-4 motion-reduce:animate-none">
        {step === 0 ? (
          <Welcome titleId={titleId} appIcon={appIcon} onAppIconChange={onAppIconChange} />
        ) : (
          <Install titleId={titleId} appIcon={appIcon} system={system} canInstall={canInstall} dismissed={dismissed} />
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 pt-2">
        {step === 0 ? (
          <PillButton onClick={() => setStep(1)}>{t('onboarding.continue')}</PillButton>
        ) : canInstall ? (
          <PillButton onClick={installNow}>
            <Download className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {t('onboarding.install.button')}
          </PillButton>
        ) : (
          <PillButton onClick={onDone}>{t('onboarding.done')}</PillButton>
        )}
        <button
          type="button"
          onClick={onDone}
          className={`h-11 rounded-full px-4 text-base font-semibold text-white/60 active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
        >
          {t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}

const FEATURES = [
  { id: 'routes', icon: BusFront, tone: 'bg-accent' },
  { id: 'alerts', icon: BellRing, tone: 'bg-amber-400' },
  { id: 'offline', icon: WifiOff, tone: 'bg-emerald-500' },
];

/** Paso 1: el icono elegido en grande, qué hace vBus y el selector de icono. */
function Welcome({ titleId, appIcon, onAppIconChange }) {
  const t = useT();
  return (
    <>
      <div className="flex flex-col items-center text-center">
        <img
          src={appIconPreview(appIcon)}
          alt=""
          width="72"
          height="72"
          className="h-[72px] w-[72px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
          draggable="false"
        />
        <h2 id={titleId} className="mt-4 text-balance text-[2rem]/tight font-bold tracking-[-0.03em]">
          {t('onboarding.welcome.title')}
        </h2>
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {FEATURES.map(({ id, icon: Icon, tone }) => (
          <li key={id} className="flex items-start gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-relief ${tone}`}>
              <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">{t(`onboarding.feature.${id}.title`)}</span>
              <span className="mt-0.5 block text-[15px]/snug font-medium text-white/60">{t(`onboarding.feature.${id}.text`)}</span>
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] px-4 pb-4 pt-4">
        <h3 className="mb-3 text-center text-base font-semibold">{t('onboarding.pickIcon')}</h3>
        <AppIconPicker value={appIcon} onChange={onAppIconChange} size={56} />
        <p className="mt-3 text-center text-sm font-medium text-white/60">{t('appIcon.hint')}</p>
      </section>
    </>
  );
}

/**
 * Paso 2: vista previa de la pantalla de inicio con el icono elegido y cómo
 * instalarla en este sistema.
 */
function Install({ titleId, appIcon, system, canInstall, dismissed }) {
  const t = useT();
  return (
    <>
      <h2 id={titleId} className="text-balance text-center text-3xl font-bold tracking-[-0.02em]">
        {t('onboarding.install.title')}
      </h2>
      <p className="mt-3 text-pretty text-center text-base font-medium text-white/60">{t('onboarding.install.why')}</p>

      <HomeScreenPreview appIcon={appIcon} />

      {system === 'ios' ? (
        <ol className="mt-6 flex flex-col gap-3">
          <InstallStep n={1} icon={Share}>
            {t('onboarding.ios.step1')}
          </InstallStep>
          <InstallStep n={2} icon={SquarePlus}>
            {t('onboarding.ios.step2')}
          </InstallStep>
          <InstallStep n={3}>{t('onboarding.ios.step3')}</InstallStep>
        </ol>
      ) : (
        !canInstall && (
          <p className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3 text-base font-medium text-white/80">
            {t(system === 'android' ? 'onboarding.android.menu' : 'onboarding.desktop.menu')}
          </p>
        )
      )}
      {dismissed && (
        <p className="mt-4 animate-fade-in text-center text-sm font-medium text-white/60 motion-reduce:animate-none">
          {t('onboarding.install.dismissed')}
        </p>
      )}
    </>
  );
}

/** Paso numerado de las instrucciones de iOS, con el símbolo que hay que buscar. */
function InstallStep({ n, icon: Icon, children }) {
  return (
    <li className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base font-bold text-black">
        {n}
      </span>
      <span className="min-w-0 flex-1 text-base font-medium">{children}</span>
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent">
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
        </span>
      )}
    </li>
  );
}

/**
 * Pantalla de inicio de mentira: una fila de apps grises y vBus con el icono
 * elegido (se nota al momento cuál se instalará). Decorativa.
 */
function HomeScreenPreview({ appIcon }) {
  const t = useT();
  return (
    <div
      role="img"
      aria-label={t('onboarding.homeScreen')}
      className="mx-auto mt-6 grid w-full max-w-[18rem] grid-cols-4 gap-x-4 gap-y-3 rounded-[2rem] bg-gradient-to-b from-[#2A3550] to-[#141A2B] p-5 shadow-glass"
    >
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className="flex flex-col items-center gap-1.5" aria-hidden="true">
          <span className="block aspect-square w-full rounded-[22%] bg-white/10" />
          <span className="block h-1.5 w-8 rounded-full bg-white/15" />
        </span>
      ))}
      <span className="flex flex-col items-center gap-1.5" aria-hidden="true">
        <img
          src={appIconPreview(appIcon)}
          alt=""
          className="block aspect-square w-full animate-fade-in drop-shadow-[0_6px_10px_rgba(0,0,0,0.5)] motion-reduce:animate-none"
          draggable="false"
        />
        <span className="text-[11px] font-semibold leading-none text-white">vBus</span>
      </span>
    </div>
  );
}
