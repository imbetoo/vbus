import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import RoutePlanner from './RoutePlanner';

// Arrastrar hacia abajo más que esto (o soltar rápido) cierra el panel.
const CLOSE_OFFSET = 120;
const CLOSE_VELOCITY = 600;
// Muelle de las hojas de iOS.
const SPRING = { type: 'spring', damping: 32, stiffness: 320, mass: 0.9 };

/**
 * Consulta rápida (lupa de la cabecera): panel inferior (framer-motion) con el
 * asistente Origen → Destino (`RoutePlanner`): tiempos de la parada más
 * cercana o de la que se elija y, con un destino, solo las líneas directas
 * (o la ruta con transbordos en Google Maps). No se guarda nada salvo con
 * "Añadir a Mis Rutas" (`onAdd(route)`).
 *
 * Va dentro de un `<dialog>` modal (foco atrapado, Escape, el fondo de la app
 * se pausa) y entra deslizándose desde abajo; sale igual al cerrarlo con la X,
 * con Escape, tocando fuera o arrastrando el asa o la cabecera hacia abajo. El
 * padre lo monta dentro de `<AnimatePresence>` para que la salida se anime.
 * Alto fijo (85 % de la pantalla): las sugerencias y los resultados cambian
 * dentro sin que el panel cambie de tamaño.
 */
export default function QuickLookSheet({ onClose, onAdd, timeFormat, refreshMs }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();

  // Se abre como modal al montarse (y se quita del DOM al terminar la salida).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

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
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[85dvh] w-full max-w-md flex-col rounded-t-[32px] border-2 border-b-0 border-white/10 bg-graphite text-white shadow-2xl shadow-black/40 will-change-transform"
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
        {/* Asa y cabecera: desde aquí se arrastra para cerrar (los campos y
            la lista hacen lo suyo sin mover el panel). */}
        <div
          className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
          onPointerDown={(event) => dragControls.start(event)}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/30" aria-hidden="true" />
          <header className="flex items-start gap-3">
            <IconHeading
              icon={Search}
              iconStrokeWidth={2.5}
              title="Consulta rápida"
              subtitle="Tiempos y líneas directas"
              titleAs="h2"
              titleId={titleId}
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

        <RoutePlanner timeFormat={timeFormat} refreshMs={refreshMs} onAdd={onAdd} />
      </motion.section>
    </dialog>
  );
}
