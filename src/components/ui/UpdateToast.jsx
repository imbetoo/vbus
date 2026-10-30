import { LoaderCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion';
import IconButton from './IconButton';
import { PRESSABLE } from './pressable';

const EXIT_MS = 300;

/**
 * "Nueva versión de vBus disponible." (actualización OTA, `useAppUpdate`):
 * aviso flotante abajo, por encima de "Crear nueva tarjeta", que no bloquea
 * nada (solo el aviso recibe toques). Grafito opaco, sin `backdrop-filter`
 * (detrás se mueve el mesh). Entra y sale deslizándose y fundiéndose (solo
 * `transform` y `opacity`). "Actualizar" recarga con la versión nueva; la X
 * lo deja para luego.
 */
export default function UpdateToast({ open, updating, onUpdate, onDismiss }) {
  // Montado mientras entra o sale; `shown` dispara la transición.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    const frame = requestAnimationFrame(() => setShown(false));
    const timer = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : EXIT_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom,0px))+6.75rem)] z-40 mx-auto w-full max-w-md px-5">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-3 rounded-3xl border border-white/10 bg-graphite/95 py-2.5 pl-3 pr-2 text-white shadow-2xl shadow-black/40 transform-gpu transition-[transform,opacity] duration-300 ease-spring will-change-[transform,opacity] motion-reduce:transition-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent shadow-relief">
          <Sparkles className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 text-base/snug font-medium">Nueva versión de vBus disponible.</p>
        <button
          type="button"
          onClick={onUpdate}
          disabled={updating}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-base font-semibold text-black active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-70 ${PRESSABLE}`}
        >
          {updating && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={2.5} aria-hidden="true" />}
          {updating ? 'Actualizando…' : 'Actualizar'}
        </button>
        {!updating && <IconButton icon={X} size="sm" label="Ahora no" onClick={onDismiss} />}
      </div>
    </div>
  );
}
