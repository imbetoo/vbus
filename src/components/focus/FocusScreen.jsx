import { Bell, BellOff, BellRing, Smartphone, X } from 'lucide-react';
import { useRef } from 'react';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';
import { useWakeLockStatus } from '../../lib/wakeLock';
import IconButton from '../ui/IconButton';
import PillButton from '../ui/PillButton';

const EXIT_MS = 300;
/** Contenedor de cristal de las pantallas de foco. */
export const PANEL = 'rounded-3xl border border-white/10 bg-white/[0.06]';

/**
 * Pantalla completa de los modos que avisan (viaje y salida): `<dialog>`
 * modal con fundido y fondo negro puro (en OLED, los píxeles negros no gastan
 * batería; la pantalla se queda encendida). `children(…)` se pinta solo
 * mientras está montada (también durante la salida).
 */
export function FocusDialog({ open, onClose, labelledBy, children }) {
  const ref = useRef(null);
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open, onClose, exitMs: EXIT_MS });

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      {...dialogProps}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-black p-0 text-white opacity-0 transform-gpu transition-opacity duration-300 ease-spring will-change-[opacity] backdrop:bg-black data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      {mounted && children}
    </dialog>
  );
}

/**
 * Columna de una pantalla de foco: cabecera (icono ámbar + nombre del modo y
 * X para terminar), contenido con scroll y, si no ha avisado aún, la nota de
 * mantener la app abierta.
 */
export function FocusLayout({ icon: Icon, label, endLabel, onEnd, showFooter = true, children }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-white/70">
          <Icon className="h-5 w-5 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
          {label}
        </p>
        <IconButton icon={X} label={endLabel} onClick={onEnd} />
      </header>

      <div className="scroll-fade mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8 pt-4" aria-live="polite">
        {children}
      </div>

      {showFooter && (
        <p className="shrink-0 pt-3 text-center text-sm font-medium text-white/50">
          Mantén vBus abierta: si cambias de app o bloqueas el móvil, el aviso puede no llegar.
        </p>
      )}
    </div>
  );
}

/** Panel ámbar del aviso, con "Entendido" (termina el modo). */
export function AlarmPanel({ title, text, onDone }) {
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
        Entendido
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
  const status = useWakeLockStatus();
  if (status === 'on') return <StatusRow ok icon={Smartphone}>La pantalla no se apagará hasta el aviso.</StatusRow>;
  if (status === 'pending' || status === 'off') {
    return <StatusRow ok icon={Smartphone}>Manteniendo la pantalla encendida…</StatusRow>;
  }
  return (
    <StatusRow icon={Smartphone}>
      Este navegador no puede mantener la pantalla encendida: tócala de vez en cuando para que no se bloquee.
    </StatusRow>
  );
}

/** Permiso de notificaciones (`notificationStatus`) y qué hacer si falta. */
export function NotificationStatus({ status }) {
  switch (status) {
    case 'granted':
      return <StatusRow ok icon={Bell}>Notificaciones activadas.</StatusRow>;
    case 'default':
      return <StatusRow icon={Bell}>Permite las notificaciones para que el aviso llegue también como notificación.</StatusRow>;
    case 'denied':
      return (
        <StatusRow icon={BellOff}>
          Notificaciones bloqueadas: te aviso aquí con sonido y vibración. Puedes activarlas en los ajustes del navegador.
        </StatusRow>
      );
    case 'ios-install':
      return (
        <StatusRow icon={BellOff}>
          En iPhone, las notificaciones solo funcionan con vBus en la pantalla de inicio (Compartir → Añadir a pantalla de
          inicio). Te aviso aquí con sonido.
        </StatusRow>
      );
    default:
      return <StatusRow icon={BellOff}>Este navegador no muestra notificaciones: te aviso aquí con sonido y vibración.</StatusRow>;
  }
}
