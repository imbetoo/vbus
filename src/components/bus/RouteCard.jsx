import { GraduationCap, House } from 'lucide-react';
import { useId, useState } from 'react';
import DisclosureButton from '../ui/DisclosureButton';
import GlassCard from '../ui/GlassCard';
import IconHeading from '../ui/IconHeading';
import BusLineItem from './BusLineItem';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House };

/**
 * Tarjeta de una rutina. `buses` son las líneas favoritas, siempre visibles;
 * `moreBuses` las secundarias que despliega "Ver más autobuses".
 */
export default function RouteCard({ title, stopName, icon, buses, moreBuses = [] }) {
  const [showMore, setShowMore] = useState(false);
  const moreId = useId();
  const Icon = ROUTE_ICONS[icon] ?? House;

  return (
    <GlassCard as="section" aria-label={title}>
      <IconHeading icon={Icon} title={title} subtitle={`Desde ${stopName}`} titleAs="h2" />

      <div className="mx-1 mb-1 mt-3 border-t-2 border-graphite" />

      <ul className="px-1">
        {buses.map((bus) => (
          <BusLineItem key={`${bus.line}-${bus.destination}`} {...bus} />
        ))}
      </ul>

      <ul id={moreId} hidden={!showMore} className="px-1">
        {moreBuses.map((bus) => (
          <BusLineItem key={`${bus.line}-${bus.destination}`} {...bus} />
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
