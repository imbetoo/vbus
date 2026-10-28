import { Reorder, useDragControls } from 'framer-motion';
import { Menu, Minus } from 'lucide-react';
import { useState } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import RouteCard from './RouteCard';

/**
 * Una tarjeta de la lista del Dashboard, reordenable (`Reorder.Item` de
 * framer-motion, solo en vertical).
 *
 * - Modo normal: la tarjeta de siempre; una pulsación larga entra en edición.
 * - Modo edición (`editing`): tiembla como los iconos de iOS (`animate-jiggle`,
 *   solo `transform`, con un desfase por tarjeta para que no tiemblen al
 *   compás), lleva un botón rojo de eliminar arriba a la izquierda y un
 *   tirador (≡) a la derecha. Solo se arrastra desde el tirador
 *   (`useDragControls` + `dragListener={false}`), así el scroll de la lista
 *   sigue funcionando al tocar el resto de la tarjeta.
 *
 * Entrada y salida: el `li` es una rejilla cuyo alto (`grid-template-rows`) se
 * abre o se cierra mientras la tarjeta aparece o se desvanece y encoge
 * (`leaving`). El encogido va en el envoltorio interior porque el `transform`
 * del `li` lo controla framer-motion al arrastrar.
 */
export default function EditableRouteItem({
  route,
  index,
  editing,
  leaving,
  animateIn,
  sortBy,
  onRemove,
  onStartEditing,
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const longPress = useLongPress(onStartEditing, { enabled: !editing });

  return (
    <Reorder.Item
      as="li"
      value={route}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      // Levantada mientras se arrastra, por encima de las demás.
      whileDrag={{ scale: 1.03, zIndex: 10 }}
      inert={leaving}
      className={`relative grid ${animateIn ? 'animate-card-in' : ''} grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-[800ms] ease-out motion-reduce:animate-none ${
        leaving ? 'pointer-events-none grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
      }`}
    >
      <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
        <div
          className={`pb-5 transition-transform duration-[800ms] ease-out ${leaving ? 'scale-90' : ''}`}
        >
          <div
            {...longPress}
            // Sin selección de texto ni menú de iOS al mantener pulsado.
            className={`relative select-none [-webkit-touch-callout:none] ${
              editing && !dragging ? 'animate-jiggle will-change-transform motion-reduce:animate-none' : ''
            }`}
            // Cada tarjeta empieza el temblor en un punto distinto del ciclo.
            style={editing ? { animationDelay: `${-(index % 4) * 70}ms` } : undefined}
          >
            <RouteCard
              {...route}
              sortBy={sortBy}
              onRemove={editing ? undefined : onRemove}
              headerAction={
                editing ? (
                  <button
                    type="button"
                    aria-label={`Mover tarjeta ${route.title}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      controls.start(event);
                    }}
                    // `touch-action: none`: el navegador no convierte el gesto en scroll.
                    className="-mr-2 -mt-1 ml-auto flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-white/70 active:cursor-grabbing active:text-white"
                  >
                    <Menu className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
                  </button>
                ) : undefined
              }
            />

            {/* Eliminar (modo edición): círculo rojo de iOS con un "menos". */}
            <button
              type="button"
              aria-label={`Eliminar tarjeta ${route.title}`}
              onClick={onRemove}
              tabIndex={editing ? 0 : -1}
              aria-hidden={!editing}
              className={`absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-urgent text-white shadow-md shadow-black/30 ring-2 ring-white/90 transition-[transform,opacity] duration-300 ease-spring after:absolute after:-inset-2 after:content-[''] active:scale-90 motion-reduce:transition-none ${
                editing ? 'scale-100 opacity-100' : 'pointer-events-none scale-50 opacity-0'
              }`}
            >
              <Minus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
