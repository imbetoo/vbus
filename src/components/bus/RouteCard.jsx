import { BusFront, GraduationCap, House, X } from 'lucide-react';
import { useId, useState } from 'react';
import Collapse from '../ui/Collapse';
import DisclosureButton from '../ui/DisclosureButton';
import GlassCard from '../ui/GlassCard';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import BusLineItem from './BusLineItem';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House, Bus: BusFront };

// Autobuses visibles sin desplegar la tarjeta.
const VISIBLE_BUSES = 3;

const busKey = (bus) => bus.id ?? `${bus.line}-${bus.destination}-${bus.time}`;

/**
 * Tarjeta de una rutina. Enseña los primeros autobuses de `buses` y
 * "Ver más autobuses" despliega el resto, haciendo crecer la tarjeta.
 */
export default function RouteCard({ title, stopName, icon, buses, onRemove }) {
  const [showMore, setShowMore] = useState(false);
  const moreId = useId();
  const Icon = ROUTE_ICONS[icon] ?? House;
  const visible = buses.slice(0, VISIBLE_BUSES);
  const more = buses.slice(VISIBLE_BUSES);

  return (
    // `origin-top`: el rebote al pulsar no desplaza la tarjeta mientras crece.
    <GlassCard as="section" aria-label={title} className="origin-top">
      <div className="flex items-start gap-2">
        <IconHeading icon={Icon} title={title} subtitle={`Desde ${stopName}`} titleAs="h2" />
        {onRemove && (
          <IconButton
            icon={X}
            size="sm"
            label={`Eliminar tarjeta ${title}`}
            onClick={onRemove}
            className="-mr-1 -mt-1 ml-auto"
          />
        )}
      </div>

      <div className="mx-1 mb-1 mt-3 border-t border-white/10" />

      <ul className="px-1">
        {visible.map((bus) => (
          <BusLineItem key={busKey(bus)} {...bus} />
        ))}
      </ul>

      {more.length > 0 && (
        <>
          <Collapse id={moreId} open={showMore}>
            <ul className="px-1">
              {more.map((bus) => (
                <BusLineItem key={busKey(bus)} {...bus} />
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
