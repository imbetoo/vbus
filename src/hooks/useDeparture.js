import { useState } from 'react';
import { headKey } from '../lib/directRoute';
import { FOCUS_TAGS } from '../lib/focusSession';
import { lineKey } from '../lib/lines';
import { etaNow, pickBus, plural } from '../lib/tripTracker';
import { useAlarmEffect } from './useFocusSession';
import { useNow } from './useNow';
import { useStopArrivals } from './useStopArrivals';

export const DEPARTURE_NOTIFICATION_TAG = FOCUS_TAGS.departure;
// La cuenta atrás se recalcula cada pocos segundos entre una petición y otra.
const TICK_MS = 5_000;
// Polling adaptativo: cada minuto si queda mucho para el aviso; cada 15 s
// cuando faltan 5 min o menos para que suene.
const FAR_POLL_MS = 60_000;
const NEAR_POLL_MS = 15_000;
const NEAR_MARGIN_MIN = 5;
// Si el autobús más parecido se aleja más que esto de lo esperado, el tuyo ya
// no está en los tiempos de Vitrasa (refuerzo retirado, avería…).
const LOST_TOLERANCE_MIN = 10;

function alarmText({ line, stop, eta }) {
  if (eta < 1) return `El ${line} está llegando a ${stop.name}.`;
  return `El ${line} llega a ${stop.name} en unos ${plural(Math.round(eta), 'minuto', 'minutos')}.`;
}

/**
 * Modo salida: sigue un autobús concreto de una parada y avisa (vibración,
 * tres tonos y notificación) cuando le faltan `lead` minutos o menos.
 *
 * `departure` = `{ stop, bus, fetchedAt, lead }`: el autobús elegido en la
 * lista de la consulta rápida y la hora de esa lectura. La API no tiene
 * número de vehículo: en cada lectura se sigue por continuidad el de la misma
 * línea y letrero cuyo tiempo encaja con lo esperado (la lectura anterior
 * menos lo que ha pasado), así un atasco retrasa el aviso en vez de
 * adelantarlo. Entre lecturas, la cuenta atrás sigue con el reloj.
 *
 * `live` a `false` (la pantalla está saliendo tras terminar) deja de pedir
 * tiempos y de avisar.
 *
 * Devuelve `{ eta, line, destination, alarm, lost, status, error }`.
 */
export function useDeparture(departure, { onEnd, live = true }) {
  const { stop, bus, fetchedAt, lead } = departure;
  const key = lineKey(bus.line);
  const head = headKey(bus.destination);
  const now = useNow(TICK_MS);
  const [tracked, setTracked] = useState(() => ({ ...bus, at: fetchedAt, lost: false }));
  const [trackedFor, setTrackedFor] = useState(fetchedAt);
  const [alarm, setAlarm] = useState(null);

  const eta = Math.max(0, etaNow(tracked, tracked.at, now));
  const pollMs = eta - lead <= NEAR_MARGIN_MIN ? NEAR_POLL_MS : FAR_POLL_MS;
  const arrivals = useStopArrivals(alarm || !live ? null : stop.id, { refreshMs: pollMs, background: true });

  // Cada lectura nueva se procesa una vez (estado ajustado en render).
  if (arrivals.status === 'success' && arrivals.updatedAt !== trackedFor) {
    const expected = etaNow(tracked, tracked.at, arrivals.updatedAt);
    const sameLine = arrivals.buses.filter((candidate) => lineKey(candidate.line) === key);
    const sameRoute = sameLine.filter((candidate) => headKey(candidate.destination) === head);
    const next = pickBus(sameRoute.length ? sameRoute : sameLine, { expected });
    setTrackedFor(arrivals.updatedAt);
    setTracked(
      next && Math.abs(next.time - expected) <= LOST_TOLERANCE_MIN
        ? { ...next, at: arrivals.updatedAt, lost: false }
        : { ...tracked, lost: true },
    );
  }

  if (!alarm && eta <= lead) setAlarm({ text: alarmText({ line: tracked.line, stop, eta }) });
  useAlarmEffect(live ? alarm : null, { title: '¡Es hora de salir!', tag: DEPARTURE_NOTIFICATION_TAG, onEnd });

  return {
    eta,
    line: tracked.line,
    destination: tracked.destination,
    alarm,
    lost: tracked.lost,
    status: arrivals.status,
    error: arrivals.error ?? null,
  };
}
