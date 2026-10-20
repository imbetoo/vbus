import { GraduationCap, House } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import IconTile from '../ui/IconTile';
import BusLineItem from './BusLineItem';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House };

export default function RouteCard({ title, stopName, icon, buses }) {
  const Icon = ROUTE_ICONS[icon] ?? House;

  return (
    <GlassCard as="section" aria-label={title}>
      <div className="flex items-center gap-3">
        <IconTile icon={Icon} />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight text-navy-900 dark:text-white">
            {title}
          </h2>
          <p className="truncate text-sm text-slate-600 dark:text-steel-300">{stopName}</p>
        </div>
      </div>

      <div className="mb-3 mt-4 border-t border-ice-100 dark:border-white/10" />

      <ul>
        {buses.map((bus) => (
          <BusLineItem key={`${bus.line}-${bus.destination}`} {...bus} />
        ))}
      </ul>
    </GlassCard>
  );
}
