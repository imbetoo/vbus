import { motion, useReducedMotion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '../../lib/haptics';
import { PRESSABLE } from '../ui/pressable';
import { useT } from '../../i18n';

// --- Anfitrión de la píldora ------------------------------------------------
// Un `<dialog>` modal va en la "top layer" y deja inerte todo lo de fuera: un
// portal a `body` con mucho `z-index` quedaría debajo y no se podría tocar.
// La píldora va dentro del diálogo de arriba si es uno pensado para ello
// (`data-island-host`: pantalla completa y sin transform, como la consulta
// rápida); con cualquier otro encima (Ajustes, hojas, la pantalla negra
// saliendo) se oculta un momento y vuelve al cerrarlo. Sin diálogos, `body`.

let host = null;
let observer = null;
const listeners = new Set();

function findHost() {
  const dialogs = document.querySelectorAll('dialog[open]');
  if (!dialogs.length) return document.body;
  const top = dialogs[dialogs.length - 1];
  return top.hasAttribute('data-island-host') ? top : null;
}

function update() {
  const next = findHost();
  if (next === host) return;
  host = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  if (!observer) {
    host = findHost();
    // Solo cambia cuando un diálogo se abre o se cierra (atributo `open`).
    observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'], childList: true });
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      observer.disconnect();
      observer = null;
    }
  };
}

function useIslandHost(enabled) {
  const current = useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    () => (enabled ? (observer ? host : findHost()) : null),
    () => null,
  );
  return enabled ? current : null;
}

const noopSubscribe = () => () => {};

/**
 * Píldora flotante ("Dynamic Island" interna): con un modo que avisa
 * minimizado, un óvalo negro arriba en el centro con lo que queda ("C3d en
 * 4 min") y la campana. Tocarla vuelve a la pantalla completa
 * (`onRestore`, que recupera la pantalla encendida dentro del gesto).
 *
 * Opaca y sin `backdrop-filter`; entra con un muelle que solo anima
 * `transform` y `opacity` (con movimiento reducido, solo un fundido). Cabe en
 * la franja libre de encima del saludo (respeta el notch: `safe-area`).
 * Si al aparecer el foco se había perdido (al minimizar, el botón que abrió
 * el aviso ya no existe), lo recoge: teclado y lector de pantalla siguen
 * teniendo dónde estar.
 */
export default function FocusPill({ visible, text, label, onRestore }) {
  const t = useT();
  const target = useIslandHost(visible);
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef(null);
  const shown = Boolean(visible && target);
  useEffect(() => {
    const active = document.activeElement;
    // Perdido: en `body` o aún en la pantalla negra recién cerrada.
    const lost = !active || active === document.body || Boolean(active.closest('dialog:not([open])'));
    if (shown && lost) buttonRef.current?.focus({ preventScroll: true });
  }, [shown, target]);
  if (!shown) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4px)] z-50 flex justify-center px-4">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => {
          haptics.tap();
          onRestore();
        }}
        aria-label={t('pill.label', { mode: label, text })}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 420, damping: 30 }}
        className={`pointer-events-auto flex h-11 min-w-0 max-w-full items-center gap-2.5 rounded-full bg-black pl-3 pr-4 text-white shadow-lg shadow-black/30 ring-1 ring-white/15 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
      >
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-300/15">
          <span className="absolute right-0 top-0 flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />
          </span>
          <Bell className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.75} aria-hidden="true" />
        </span>
        <span className="truncate text-base font-semibold tabular-nums tracking-tight">{text}</span>
      </motion.button>
    </div>,
    target,
  );
}
