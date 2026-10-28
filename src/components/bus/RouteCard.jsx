import { BusFront, GraduationCap, House, X } from 'lucide-react';
import { useId, useState } from 'react';
import Collapse from '../ui/Collapse';
import DisclosureButton from '../ui/DisclosureButton';
import GlassCard from '../ui/GlassCard';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import { sortBuses } from '../../services/vigobusAdapter';
import BusLineItem from './BusLineItem';
import { cardColor } from './cardColors';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House, Bus: BusFront };

const busKey = (bus) => bus.id ?? `${bus.line}-${bus.destination}-${bus.time}`;

/**
 * Tarjeta de una rutina. Ordena sus autobuses según `sortBy` (ajustes), enseña
 * los `busesToShow` primeros (elegidos al crearla) y "Ver más autobuses"
 * despliega el resto, haciendo crecer la tarjeta.
 * El fondo del icono usa el color elegido al crearla (`color`, ver
 * `cardColors.js`). `timeFormat` (ajustes): minutos que faltan o hora de
 * llegada, calculada desde `updatedAt` (cuándo llegaron los tiempos). `headerAction` sustituye a la X de eliminar (en modo
 * edición, el tirador para arrastrar).
 */
export default function RouteCard({
  title,
  alias,
  stopId,
  stopName,
  icon,
  color,
  buses,
  lines,
  busesToShow = 3,
  sortBy = 'time',
  timeFormat = 'relative',
  updatedAt,
  onRemove,
  headerAction,
}) {
  const [showMore, setShowMore] = useState(false);
  const moreId = useId();
  const Icon = ROUTE_ICONS[icon] ?? House;
  const tone = cardColor(color);
  // Con alias ("Trabajo 💻"), el alias va de título y el nombre oficial de la
  // parada pasa al subtítulo; sin alias, el título es la parada y el
  // subtítulo dice su número. (Tarjetas antiguas sin `alias`: su `title`.)
  const name = alias ?? (title !== stopName ? title : '');
  const displayTitle = name || stopName || title;
  const subtitle = name || !stopId ? `Desde ${stopName}` : `Parada ${stopId}`;
  // Solo las líneas visibles de la tarjeta (`lines`, editables con el lápiz).
  const shown = lines?.length ? buses.filter((bus) => lines.includes(bus.line)) : buses;
  const sorted = sortBuses(shown, lines, sortBy);
  const visible = sorted.slice(0, busesToShow);
  const more = sorted.slice(busesToShow);

  return (
    // `origin-top`: el rebote al pulsar no desplaza la tarjeta mientras crece.
    <GlassCard as="section" aria-label={displayTitle} className="origin-top">
      <div className="flex items-start gap-2">
        <IconHeading icon={Icon} iconTone={`${tone.bg} ${tone.icon}`} title={displayTitle} subtitle={subtitle} titleAs="h2" />
        {/* `headerAction` (modo edición: el tirador) sustituye a la X. */}
        {headerAction}
        {!headerAction && onRemove && (
          <IconButton
            icon={X}
            size="sm"
            label={`Eliminar tarjeta ${displayTitle}`}
            onClick={onRemove}
            className="-mr-1 -mt-1 ml-auto"
          />
        )}
      </div>

      <div className="mx-1 mb-1 mt-3 border-t border-white/10" />

      <ul className="px-1">
        {visible.map((bus) => (
          <BusLineItem key={busKey(bus)} {...bus} timeFormat={timeFormat} fetchedAt={updatedAt} />
        ))}
      </ul>

      {more.length > 0 && (
        <>
          <Collapse id={moreId} open={showMore}>
            <ul className="px-1">
              {more.map((bus) => (
                <BusLineItem key={busKey(bus)} {...bus} timeFormat={timeFormat} fetchedAt={updatedAt} />
              ))}
            </ul>
          </Collapse>

          <div className="mt-1 px-2">
            <DisclosureButton
              expanded={showMore}
              onToggle={() => setShowMore((value) => !value)}
              controls={moreId}
            >
              {showMore ? 'Ver menos autobuses' : 'Ver más autobuses'}
            </DisclosureButton>
          </div>
        </>
      )}
    </GlassCard>
  );
}
