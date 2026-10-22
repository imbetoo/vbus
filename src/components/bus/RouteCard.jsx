import { BusFront, GraduationCap, House, X } from 'lucide-react';
import { useId, useState } from 'react';
import DisclosureButton from '../ui/DisclosureButton';
import GlassCard from '../ui/GlassCard';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import BusLineItem from './BusLineItem';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House, Bus: BusFront };

/**
 * Tarjeta de una rutina. `buses` son las líneas favoritas, siempre visibles;
 * `moreBuses` las secundarias que despliega "Ver más autobuses".
 */
export default function RouteCard({ title, stopName, icon, buses, moreBuses = [], onRemove }) {
  const [showMore, setShowMore] = useState(false);
  const moreId = useId();
  const Icon = ROUTE_ICONS[icon] ?? House;

  return (
    <GlassCard as="section" aria-label={title}>
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
        {buses.map((bus) => (
          <BusLineItem key={bus.id ?? `${bus.line}-${bus.destination}`} {...bus} />
        ))}
      </ul>

      <ul id={moreId} hidden={!showMore} className="px-1">
        {moreBuses.map((bus) => (
          <BusLineItem key={bus.id ?? `${bus.line}-${bus.destination}`} {...bus} />
        ))}
      </ul>

      <div className="mt-1 px-2">
        <DisclosureButton
          expanded={showMore}
          onToggle={() => setShowMore((value) => !value)}
          controls={moreId}
        >
          {showMore ? 'Ver menos autobuses' : 'Ver más autobuses'}
        </DisclosureButton>
      </div>
    </GlassCard>
  );
}
