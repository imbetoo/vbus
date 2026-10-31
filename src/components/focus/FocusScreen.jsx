import { Bell, BellOff, BellRing, ChevronDown, Smartphone, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';
import { haptics } from '../../lib/haptics';
import { useWakeLockStatus } from '../../lib/wakeLock';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';
import { useT } from '../../i18n';

const EXIT_MS = 300;
/** Contenedor de cristal de las pantallas de foco. */
export const PANEL = 'rounded-3xl border border-white/10 bg-white/[0.06]';
// Marca de la entrada de historial que pone la pantalla de foco.
const HISTORY_KEY = 'vbusFocus';

// `requestEnd` (salir pidiendo confirmación), `minimize` (a la píldora; puede
// no haber) y si la alarma sigue pendiente.
const FocusContext = createContext({ requestEnd: () => {}, minimize: null, armedRef: { current: false } });

/**
 * Pantalla completa de los modos que avisan (viaje y salida): `<dialog>`
 * modal con fundido y fondo negro puro (en OLED, los píxeles negros no gastan
 * batería; la pantalla se queda encendida). El contenido se pinta solo
 * mientras está montada (también durante la salida).
 *
 * Con la pantalla siempre encendida y el móvil en la mano, un toque sin
 * querer no puede cancelar la alarma:
 *
 * - Tocar fuera no hace nada.
 * - La X (`FocusLayout`), Escape, el gesto o botón "atrás" de Android (que en
 *   Chrome cancela el diálogo) y el "atrás" del historial (navegadores sin
 *   ese gesto: se pone una entrada propia) piden confirmación: "¿Detener el
 *   aviso?" (`ConfirmStopModal`). Si el navegador cierra el diálogo a la
 *   fuerza, se vuelve a abrir y también pregunta.
 * - Si la alarma ya sonó (`FocusLayout` con `armed` a `false`), no hay nada
 *   que cancelar: se sale sin preguntar.
 *
 * Minimizar (`onMinimize`, el chevron de `FocusLayout`) no cancela nada: el
 * diálogo se cierra (`open` a `false`) mientras la sesión sigue (`active`) en
 * la píldora (`FocusPill`). La entrada del historial es de la sesión, no de
 * la pantalla: con la píldora, "atrás" vuelve a la pantalla completa
 * (`onRestore`) en vez de salir de la app y perder la alarma.
 *
 * `onEnd` termina el modo de verdad (también "Entendido" y el apagado solo).
 */
export function FocusDialog({ open, active = open, onEnd, onMinimize, onRestore, labelledBy, children }) {
  const ref = useRef(null);
  const armedRef = useRef(true);
  const [confirming, setConfirming] = useState(false);
  const requestEnd = useCallback(() => {
    if (armedRef.current) setConfirming(true);
    else onEnd();
  }, [onEnd]);
  // Escape y "atrás" (`cancel`) preguntan; el cierre que sigue a terminar de
  // verdad (`open` ya en `false`) no.
  const { mounted, dialogProps } = useAnimatedDialog({
    ref,
    open,
    onClose: () => {
      if (open) requestEnd();
    },
    exitMs: EXIT_MS,
  });

  // "Atrás" del historial: una entrada propia mientras dura la sesión; al
  // volver atrás se repone y se pregunta (o, minimizada, se vuelve a la
  // pantalla completa). Al terminar, se quita.
  const backRef = useRef(null);
  useEffect(() => {
    backRef.current = open ? requestEnd : onRestore;
  });
  useEffect(() => {
    if (!active) return undefined;
    window.history.pushState({ [HISTORY_KEY]: true }, '');
    const onPopState = () => {
      window.history.pushState({ [HISTORY_KEY]: true }, '');
      backRef.current?.();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.[HISTORY_KEY]) window.history.back();
    };
  }, [active]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      {...dialogProps}
      // Tocar fuera no cierra (ni pregunta).
      onClick={undefined}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        if (!open) {
          dialogProps.onClose(event);
          return;
        }
        // Cerrado por el navegador sin pedirlo (p. ej. "atrás" repetido): se
        // vuelve a abrir y se pregunta.
        event.currentTarget.showModal();
        event.currentTarget.toggleAttribute('data-shown', true);
        requestEnd();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-black p-0 text-white opacity-0 transform-gpu transition-opacity duration-300 ease-spring will-change-[opacity] backdrop:bg-black data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      <FocusContext.Provider value={{ requestEnd, minimize: onMinimize ?? null, armedRef }}>
        {mounted && children}
      </FocusContext.Provider>
      <ConfirmStopModal
        open={open && confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onEnd();
        }}
      />
    </dialog>
  );
}

/**
 * "¿Detener el aviso?" (alerta de iOS): "Cancelar" (neutro, con el foco y la
 * acción de Escape o de tocar fuera) y "Sí, detener" (rojo, destructivo).
 */
function ConfirmStopModal({ open, onCancel, onConfirm }) {
  const t = useT();
  const titleId = useId();
  const messageId = useId();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={messageId}
      role="alertdialog"
      className="w-[min(88vw,20rem)]"
    >
      <div className="flex flex-col gap-2 p-5 text-center">
        <h2 id={titleId} className="text-xl/tight font-bold tracking-[-0.01em]">
          {t('focus.confirm.title')}
        </h2>
        <p id={messageId} className="text-pretty text-base font-medium text-white/70">
          {t('focus.confirm.text')}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`h-12 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              // Desactivar la alarma también se nota en la mano.
              haptics.impact();
              onConfirm();
            }}
            className={`h-12 rounded-full bg-urgent text-lg font-semibold text-white active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${PRESSABLE}`}
          >
            {t('focus.confirm.stop')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Columna de una pantalla de foco: cabecera (icono ámbar + nombre del modo,
 * chevron para minimizar a la píldora mientras la alarma esté pendiente y X
 * para salir, que entonces pide confirmación: `armed`), contenido con scroll
 * y, si no ha avisado aún, la nota de mantener la app abierta.
 */
export function FocusLayout({ icon: Icon, label, endLabel, armed = true, children }) {
  const t = useT();
  const { requestEnd, minimize, armedRef } = useContext(FocusContext);
  useEffect(() => {
    armedRef.current = armed;
  }, [armedRef, armed]);

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-white/70">
          <Icon className="h-5 w-5 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {minimize && armed && (
            <IconButton
              icon={ChevronDown}
              label={t('focus.minimize')}
              onClick={() => {
                haptics.tap();
                minimize();
              }}
            />
          )}
          <IconButton icon={X} label={endLabel} onClick={requestEnd} />
        </div>
      </header>

      <div className="scroll-fade mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pt-4" aria-live="polite">
        {children}
      </div>

      {armed && (
        <p className="shrink-0 pt-3 text-center text-sm font-medium text-white/50">
          {t('focus.keepOpen')}
        </p>
      )}
    </div>
  );
}

/** Panel ámbar del aviso, con "Entendido" (termina el modo). */
export function AlarmPanel({ title, text, onDone }) {
  const t = useT();
  return (
    <section
      role="alert"
      className="flex animate-fade-in flex-col items-center rounded-3xl border-2 border-amber-300/70 bg-amber-300/15 px-5 py-8 text-center motion-reduce:animate-none"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-300 text-black shadow-relief">
        <BellRing className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <p className="mt-4 text-3xl font-bold tracking-tight">{title}</p>
      <p className="mt-2 text-pretty text-lg font-medium text-white/80">{text}</p>
      <PillButton className="mt-6" onClick={onDone}>
        {t('focus.gotIt')}
      </PillButton>
    </section>
  );
}

/** Fila de estado: verde si todo va bien, ámbar si falta algo (con el porqué). */
export function StatusRow({ ok, icon: Icon, children }) {
  return (
    <li className={`flex items-start gap-3 ${PANEL} px-4 py-3 text-sm font-medium text-white/80`}>
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? 'text-emerald-400' : 'text-amber-300'}`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

/** Pantalla encendida (Wake Lock) o por qué no. */
export function ScreenStatus() {
  const t = useT();
  const status = useWakeLockStatus();
  if (status === 'on') return <StatusRow ok icon={Smartphone}>{t('focus.screen.on')}</StatusRow>;
  if (status === 'pending' || status === 'off') {
    return <StatusRow ok icon={Smartphone}>{t('focus.screen.pending')}</StatusRow>;
  }
  return (
    <StatusRow icon={Smartphone}>
      {t('focus.screen.unsupported')}
    </StatusRow>
  );
}

/** Permiso de notificaciones (`notificationStatus`) y qué hacer si falta. */
export function NotificationStatus({ status }) {
  const t = useT();
  switch (status) {
    case 'granted':
      return <StatusRow ok icon={Bell}>{t('focus.notif.granted')}</StatusRow>;
    case 'default':
      return <StatusRow icon={Bell}>{t('focus.notif.default')}</StatusRow>;
    case 'denied':
      return (
        <StatusRow icon={BellOff}>
          {t('focus.notif.denied')}
        </StatusRow>
      );
    case 'ios-install':
      return (
        <StatusRow icon={BellOff}>
          {t('focus.notif.ios')}
        </StatusRow>
      );
    default:
      return <StatusRow icon={BellOff}>{t('focus.notif.unsupported')}</StatusRow>;
  }
}
