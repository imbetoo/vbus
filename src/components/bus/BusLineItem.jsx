import PingDot from '../ui/PingDot';
import ArrivalTime from './ArrivalTime';
import LineBadge from './LineBadge';
import { isUrgent } from './urgency';

export default function BusLineItem({ line, color, time, destination, timeFormat, fetchedAt }) {
  const urgent = isUrgent(time);

  return (
    <li className="flex items-center gap-3 py-2">
      <LineBadge line={line} color={color} />

      <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-[-0.01em]">{destination}</span>

      <span className="flex shrink-0 items-center gap-2">
        <PingDot ping={urgent} className={urgent ? 'bg-urgent' : 'bg-white/80'} />
        <ArrivalTime minutes={time} urgent={urgent} format={timeFormat} fetchedAt={fetchedAt} />
      </span>
    </li>
  );
}
