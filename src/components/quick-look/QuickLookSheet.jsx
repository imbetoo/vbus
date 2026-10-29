import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { BusFront, CircleAlert, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { stopLines } from '../../data/stops';
import { useStopArrivals } from '../../hooks/useStopArrivals';
import { sortBuses, toRouteCard, uniqueLines } from '../../services/vigobusAdapter';
import BusLineItem from '../bus/BusLineItem';
import { DEFAULT_CARD_COLOR } from '../bus/cardColors';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import { PRESSABLE } from '../ui/pressable';

// Arrastrar hacia abajo más que esto (o soltar rápido) cierra el panel.
const CLOSE_OFFSET = 120;
const CLOSE_VELOCITY = 600;
// Muelle de las hojas de iOS.
const SPRING = { type: 'spring', damping: 32, stiffness: 320, mass: 0.9 };

function errorMessage(error) {
  if (error?.kind === 'timeout') return 'El servidor está arrancando. Los tiempos llegarán en unos segundos.';
  if (error?.kind === 'network') return 'No se puede conectar con el servidor de VigoBus.';
  if (error?.kind === 'not_found') return 'Vitrasa no reconoce esta parada.';
  return 'Vitrasa no responde ahora mismo. Inténtalo en un momento.';
}

/**
 * Consulta rápida de una parada SIN guardarla: panel inferior (framer-motion)
 * con sus llegadas en tiempo real, que se refrescan como las tarjetas.
 *
 * Va dentro de un `<dialog>` modal (foco atrapado, Escape, el fondo de la app
 * se pausa) y entra deslizándose desde abajo; sale igual al cerrarlo con la X,
 * con Escape, tocando fuera o arrastrando el asa o la cabecera hacia abajo. El
 * padre lo monta dentro de `<AnimatePresence>` para que la salida se anime.
 * "Añadir a Mis Rutas" (`onAdd(route)`) es lo único que crea una tarjeta.
 */
export default function QuickLookSheet({ stop, onClose, onAdd, timeFormat, refreshMs }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const arrivals = useStopArrivals(stop.id, { refreshMs });

  // Se abre como modal al montarse (y se quita del DOM al terminar la salida).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  const buses = sortBuses(arrivals.buses, [], 'time');
  // Líneas de la tarjeta si se guarda: las de los datos abiertos o, si no, las
  // que llegan ahora.
  const knownLines = stopLines(stop.id);
  const lines = knownLines.length ? knownLines : uniqueLines(buses).map(({ line }) => line);
  const transition = reduceMotion ? { duration: 0 } : SPRING;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: se anima la salida en vez de cerrar de golpe.
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-transparent"
    >
      {/* Velo: oscurece la app y cierra al tocarlo. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
        onClick={onClose}
      />

      <motion.section
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-[32px] border-2 border-b-0 border-white/10 bg-graphite text-white shadow-2xl shadow-black/40 will-change-transform"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={transition}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onClose();
        }}
      >
        {/* Asa y cabecera: desde aquí se arrastra para cerrar (la lista de
            llegadas hace scroll sin mover el panel). */}
        <div
          className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30" aria-hidden="true" />
          <header className="flex items-start gap-3">
            <IconHeading
              icon={BusFront}
              title={stop.name}
              subtitle={`Parada ${stop.id} · Consulta rápida`}
              titleAs="h2"
              titleId={titleId}
              wrap="title"
            />
            <IconButton
              icon={X}
              label="Cerrar"
              onClick={onClose}
              onPointerDown={(event) => event.stopPropagation()}
              className="ml-auto shrink-0"
            />
          </header>
        </div>

        <div className="min-h-0 flex-1 transform-gpu overflow-y-auto overscroll-contain px-5 pb-2 pt-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-2" aria-live="polite">
            {arrivals.status === 'loading' && (
              <p className="animate-fade-in py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
                Cargando tiempos…
              </p>
            )}
            {arrivals.status === 'error' && (
              <p className="flex animate-fade-in items-start gap-2 py-3 text-base font-medium text-red-200 motion-reduce:animate-none">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
                {errorMessage(arrivals.error)}
              </p>
            )}
            {arrivals.status === 'success' &&
              (buses.length ? (
                <ul className="animate-fade-in motion-reduce:animate-none">
                  {buses.map((bus) => (
                    <BusLineItem key={bus.id} {...bus} timeFormat={timeFormat} fetchedAt={arrivals.updatedAt} />
                  ))}
                </ul>
              ) : (
                <p className="animate-fade-in py-3 text-base font-medium text-white/70 motion-reduce:animate-none">
                  No hay autobuses previstos ahora mismo.
                </p>
              ))}
          </div>
          {arrivals.status === 'success' && arrivals.error && (
            <p className="mt-2 animate-fade-in text-sm font-medium text-white/50 motion-reduce:animate-none">
              No se pudieron actualizar: son los últimos tiempos recibidos.
            </p>
          )}
        </div>

        <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
          {/* Botón secundario (cristal): guardar es opcional aquí. */}
          <button
            type="button"
            disabled={!lines.length}
            onClick={() => onAdd(toRouteCard({ stop, buses, lines, busesToShow: 3, color: DEFAULT_CARD_COLOR }))}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${PRESSABLE}`}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Añadir a Mis Rutas
          </button>
        </div>
      </motion.section>
    </dialog>
  );
}
