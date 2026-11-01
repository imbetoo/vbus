import { Reorder, useDragControls } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { memo, useState } from 'react';
import { useLongPress } from '../../hooks/useLongPress';
import { useT } from '../../i18n';
import { haptics } from '../../lib/haptics';
import RouteCard from './RouteCard';

/**
 * Una tarjeta de la lista del Dashboard, reordenable (`Reorder.Item` de
 * framer-motion, solo en vertical).
 *
 * - Modo normal: la tarjeta de siempre; una pulsación larga entra en edición.
 * - Modo edición (`editing`), como en el mockup:
 *   1. Botón rojo con aspa superpuesto arriba a la izquierda: elimina.
 *   2. Botón oscuro con lápiz arriba a la derecha (en el sitio de la X):
 *      abre "Editar tarjeta" (alias y líneas, `onEditCard`).
 *   3. Tirador ≡ fuera de la tarjeta, en el margen derecho y centrado en
 *      vertical: la tarjeta se encoge (transform) para hacerle sitio. Solo se arrastra
 *      desde él (`useDragControls` + `dragListener={false}`), así el scroll de
 *      la lista sigue funcionando al tocar el resto de la tarjeta.
 *   La tarjeta tiembla como los iconos de iOS (`animate-jiggle`, solo
 *   `transform`, desfasado por tarjeta); el tirador se queda quieto.
 *
 * Entrada y salida: el `li` es una rejilla cuyo alto (`grid-template-rows`) se
 * abre o se cierra mientras la tarjeta aparece o se desvanece y encoge
 * (`leaving`). El encogido va en el envoltorio interior porque el `transform`
 * del `li` lo controla framer-motion al arrastrar.
 */
function EditableRouteItem({
  route,
  index,
  editing,
  leaving,
  animateIn,
  sortBy,
  timeFormat,
  failure,
  onRemove,
  onEditCard,
  onStartEditing,
  onDepartureAlarm,
  nearMeters = null,
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const longPress = useLongPress(onStartEditing, { enabled: !editing });
  const t = useT();
  const name = route.alias || route.stopName || route.title;

  return (
    <Reorder.Item
      as="li"
      value={route}
      dragListener={false}
      dragControls={controls}
      // Solo posición: al reordenar no hace falta corregir tamaños (más barato).
      layout="position"
      // Levantar y soltar la tarjeta se notan en la mano (toque háptico).
      onDragStart={() => {
        haptics.impact();
        setDragging(true);
      }}
      onDragEnd={() => {
        haptics.tap();
        setDragging(false);
      }}
      // Levantada mientras se arrastra, por encima de las demás.
      whileDrag={{ scale: 1.03, zIndex: 10 }}
      inert={leaving}
      className={`relative grid ${animateIn ? 'animate-card-in' : ''} grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-[800ms] ease-out motion-reduce:animate-none ${
        leaving ? 'pointer-events-none grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
      }`}
    >
      <div className={`min-h-0 ${leaving ? 'overflow-hidden' : ''}`}>
        <div className={`pb-5 transition-transform duration-[800ms] ease-out ${leaving ? 'scale-90' : ''}`}>
          {/* En edición, la tarjeta se encoge al 92 % desde la izquierda para dejar
              sitio al tirador. Con `transform` (no con margen ni padding): el
              navegador no recalcula el layout de la lista en cada fotograma y
              framer-motion no tiene que volver a medir las tarjetas. */}
          <div className="relative">
            <div
              className={`origin-left transition-transform duration-300 ease-smooth motion-reduce:transition-none ${
                editing ? 'scale-[0.92] will-change-transform' : ''
              }`}
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
                  timeFormat={timeFormat}
                  failure={failure}
                  editing={editing}
                  onRemove={onRemove}
                  onEditCard={onEditCard}
                  onDepartureAlarm={onDepartureAlarm}
                  nearMeters={nearMeters}
                />

                {/* Eliminar (modo edición): círculo rojo de iOS con aspa. */}
                <button
                  type="button"
                  aria-label={t('card.remove', { name })}
                  onClick={() => onRemove(route.id)}
                  tabIndex={editing ? 0 : -1}
                  aria-hidden={!editing}
                  className={`absolute -left-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-urgent text-white shadow-md shadow-black/30 ring-2 ring-white/90 transition-[transform,opacity] duration-300 ease-spring after:absolute after:-inset-2 after:content-[''] active:scale-90 motion-reduce:transition-none ${
                    editing ? 'scale-100 opacity-100' : 'pointer-events-none scale-50 opacity-0'
                  }`}
                >
                  <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Tirador ≡ en el margen derecho, centrado con la tarjeta. Sobre el
                fondo de la app: oscuro en claro, blanco en oscuro. */}
            <button
              type="button"
              aria-label={t('card.move', { name })}
              tabIndex={editing ? 0 : -1}
              aria-hidden={!editing}
              onPointerDown={(event) => {
                if (!editing) return;
                event.preventDefault();
                controls.start(event);
              }}
              // `touch-action: none`: el navegador no convierte el gesto en scroll.
              className={`absolute inset-y-0 -right-2 flex w-9 cursor-grab touch-none items-center justify-center text-black/40 transition-opacity duration-300 active:cursor-grabbing active:text-black/70 dark:text-white/50 dark:active:text-white/80 ${
                editing ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}

// Memorizada: con callbacks estables del Dashboard, solo se repinta la tarjeta
// que cambia (no todas al tocar una).
export default memo(EditableRouteItem);
