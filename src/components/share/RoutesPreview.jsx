import { useEffect, useState } from 'react';
import { findStop, loadStopsList } from '../../data/stops';
import { cardLabel } from '../../lib/routesShare';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';

/**
 * Lista breve de las tarjetas que se comparten o se reciben (`entries`:
 * `{ stopId, alias, lines }`): nombre (alias o parada), número de parada y
 * sus líneas. Los nombres salen de `stopsList` (en el precache); mientras
 * carga, "Parada N".
 */
export default function RoutesPreview({ entries }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadStopsList().then(
      () => alive && setReady(true),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ul className="divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.06] px-4" aria-label="Rutas">
      {entries.map((entry, i) => {
        const stop = ready ? findStop(entry.stopId) : null;
        return (
          <li key={`${entry.stopId}-${i}`} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{cardLabel(entry, stop)}</p>
              <p className="text-sm font-medium tabular-nums text-white/60">{`Parada ${entry.stopId}`}</p>
            </div>
            <div className="flex max-w-[50%] flex-wrap justify-end gap-1">
              {entry.lines.slice(0, 4).map((line) => (
                <LineBadge key={line} line={line} color={lineColor(line)} className="h-7 min-w-7 rounded-lg px-1.5 text-sm" />
              ))}
              {entry.lines.length > 4 && (
                <span className="flex h-7 items-center px-1 text-sm font-medium text-white/60">{`+${entry.lines.length - 4}`}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
