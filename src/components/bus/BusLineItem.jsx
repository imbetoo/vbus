import PingDot from '../ui/PingDot';
import ArrivalTime from './ArrivalTime';
import LineBadge from './LineBadge';
import { isUrgent } from './urgency';

export default function BusLineItem({ line, color, time, destination }) {
  const urgent = isUrgent(time);

  return (
    <li className="flex items-center gap-4 py-2.5">
      <LineBadge line={line} color={color} />

      <span className="min-w-0 flex-1 truncate text-[15px] text-slate-600 dark:text-steel-300">
        {destination}
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {urgent && <PingDot className="bg-urgent dark:bg-urgent-dark" />}
        <ArrivalTime minutes={time} urgent={urgent} />
      </span>
    </li>
  );
}
