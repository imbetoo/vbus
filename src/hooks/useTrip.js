import { useMemo, useState } from 'react';
import { getLoadedRouteIndex } from '../data/routes';
import { t } from '../i18n';
import { stopById } from '../data/stops';
import { FOCUS_TAGS } from '../lib/focusSession';
import { formatDistance, haversineMeters } from '../lib/geo';
import { lineKey } from '../lib/lines';
import {
  ALERT_MINUTES,
  BOARDED_PROGRESS_M,
  MAX_GPS_ACCURACY_M,
  alertReason,
  etaNow,
  pickBus,
  rideMinutes,
  routeProgress,
  tripPath,
} from '../lib/tripTracker';
import { useAlarmEffect } from './useFocusSession';
import { useNow } from './useNow';
import { useStopArrivals } from './useStopArrivals';
import { useWatchPosition } from './useWatchPosition';

// La cuenta atrás se recalcula cada pocos segundos entre una petición y otra.
const TICK_MS = 5_000;
// Tiempos de la parada de bajada: cada minuto y, cerca del aviso, más a menudo.
const FAR_POLL_MS = 60_000;
const NEAR_POLL_MS = 20_000;
const NEAR_MINUTES = 8;
// Si el autobús seguido desaparece de la parada de bajada cuando estaba a
// punto de llegar, es que ha llegado (cuenta como aviso).
const ARRIVED_SLACK_MIN = 5;
export const TRIP_NOTIFICATION_TAG = FOCUS_TAGS.trip;

function alarmText({ reason, eta, remainingMetres, alight }) {
  if (reason === 'gps') return t('trip.alert.gps', { distance: formatDistance(remainingMetres), stop: alight.name });
  if (eta < 1) return t('trip.alert.arriving', { stop: alight.name });
  return t('trip.alert.eta', { stop: alight.name, n: Math.round(eta) });
}

/**
 * Modo viaje: sigue tu autobús hasta la parada de bajada y avisa unos 3 min
 * antes (`tripTracker.js` explica las dos señales: tiempo real de Vitrasa en
 * la parada de bajada y GPS sobre el recorrido del GTFS).
 *
 * `trip` = `{ boarding, destination, options, lines }` (lo que enseña la ruta
 * directa); `originBuses`/`originUpdatedAt`: llegadas a la parada de subida,
 * ya filtradas (las pide la consulta rápida). Fases:
 *
 * - `waiting`: esperando el autobús. Se sigue el primero que llega (o el que
 *   elijas). Pasas a `riding` al tocar "Ya voy en el autobús", cuando el GPS
 *   ve que avanzas por el recorrido o, sin GPS, cuando ese autobús pasa.
 * - `riding`: en camino. Avisa (vibración, sonido y notificación) cuando
 *   faltan ≤3 min según Vitrasa o ≤700 m según el GPS.
 * - `alarm`: ya avisó; pasados 5 min el modo viaje se apaga solo (`onEnd`).
 *
 * `live` a `false` (la pantalla está saliendo tras terminar) apaga el GPS, las
 * peticiones y el aviso.
 */
export function useTrip(trip, { originBuses, originUpdatedAt, onEnd, live = true }) {
  const { boarding, destination, options, lines } = trip;
  const now = useNow(TICK_MS);
  // Línea elegida en la espera (`null`: la del primer autobús que llega).
  const [selectedKey, setSelectedKey] = useState(null);
  const [boarded, setBoarded] = useState(null);
  const [alarm, setAlarm] = useState(null);
  // Autobús seguido en la parada de bajada y la lectura de la que sale.
  const [tracked, setTracked] = useState(null);
  const [trackedFor, setTrackedFor] = useState(null);
  // Autobús seguido en la parada de subida (para saber cuándo pasa).
  const [watchA, setWatchA] = useState(null);
  // GPS: posición inicial sobre el recorrido y tramo mínimo (solo se avanza).
  const [gpsBase, setGpsBase] = useState(null);
  const [segmentFloor, setSegmentFloor] = useState(0);

  // --- Autobús y tramo --------------------------------------------------
  const busA = useMemo(
    () => pickBus(originBuses, { keys: selectedKey ? new Set([selectedKey]) : null }),
    [originBuses, selectedKey],
  );
  const line = boarded?.line ?? busA?.line ?? options[0]?.line ?? lines[0] ?? null;
  const key = line != null ? lineKey(line) : null;
  const option = options.find((candidate) => candidate.key === key) ?? options[0] ?? null;
  const alight = option?.alight ?? destination;
  const path = useMemo(
    () => tripPath(getLoadedRouteIndex(), { line, boardingId: boarding.id, alightId: alight.id }),
    [line, boarding.id, alight.id],
  );
  const coords = useMemo(
    () =>
      path?.stops.map((id) => {
        const stop = stopById(id);
        return stop && Number.isFinite(stop.lat) && Number.isFinite(stop.lon) ? { lat: stop.lat, lon: stop.lon } : null;
      }) ?? [],
    [path],
  );
  const directKeys = useMemo(() => new Set(lines.map(lineKey)), [lines]);

  // --- GPS -----------------------------------------------------------------
  const gps = useWatchPosition(live && !alarm);
  const fix = gps.position && gps.position.accuracy <= MAX_GPS_ACCURACY_M ? gps.position : null;
  const progress = useMemo(() => {
    if (!fix) return null;
    if (path) return routeProgress(path, coords, fix, { fromSegment: segmentFloor });
    // Sin recorrido verificado: línea recta hasta la parada de bajada.
    return Number.isFinite(alight.lat) && Number.isFinite(alight.lon)
      ? { along: null, remainingMetres: haversineMeters(fix, alight), stopsLeft: null, offRoute: false }
      : null;
  }, [fix, path, coords, segmentFloor, alight]);
  const onRoute = Boolean(progress && progress.along != null && !progress.offRoute);

  // Estado ajustado en render (sin efectos): cada señal nueva se procesa una vez.
  if (onRoute) {
    if (boarded && progress.segment - 1 > segmentFloor) setSegmentFloor(progress.segment - 1);
    if (!boarded) {
      if (gpsBase?.key !== key) setGpsBase({ key, along: progress.along });
      else if (progress.along - gpsBase.along >= BOARDED_PROGRESS_M) setBoarded({ how: 'gps', line });
    }
  }

  // Sin GPS: el autobús que esperabas acaba de pasar por la parada de subida.
  if (!boarded && originUpdatedAt && watchA?.for !== originUpdatedAt) {
    const previous = watchA?.key ? watchA : null;
    const before = previous ? etaNow(previous, previous.at, originUpdatedAt) : null;
    const same = previous ? pickBus(originBuses, { keys: new Set([previous.key]) }) : null;
    const passed = previous && before <= 1 && (!same || same.time > before + 3);
    if (passed && gps.status !== 'active') setBoarded({ how: 'passed', line: previous.line });
    setWatchA(
      busA
        ? { key: lineKey(busA.line), line: busA.line, time: busA.time, at: originUpdatedAt, for: originUpdatedAt }
        : { for: originUpdatedAt },
    );
  }

  // --- Tiempo real en la parada de bajada ---------------------------------
  const trackedEta = tracked && !tracked.arrived ? etaNow(tracked, tracked.at, now) : null;
  const pollMs = trackedEta != null && trackedEta <= NEAR_MINUTES ? NEAR_POLL_MS : FAR_POLL_MS;
  const dest = useStopArrivals(alarm || !live ? null : alight.id, { refreshMs: pollMs, background: true });

  if (dest.status === 'success' && dest.updatedAt !== trackedFor) {
    const candidates = dest.buses.filter((bus) => directKeys.has(lineKey(bus.line)));
    // Lo que debería faltarle a tu autobús: la lectura anterior menos lo que
    // ha pasado; si no hay, lo que dice el GPS o, esperando, su llegada a la
    // subida más el trayecto.
    let expected = null;
    if (tracked && !tracked.arrived && tracked.key === key) expected = etaNow(tracked, tracked.at, dest.updatedAt);
    else if (boarded && onRoute) expected = rideMinutes(progress.remainingMetres);
    else if (!boarded && busA && originUpdatedAt && option?.metres != null) {
      expected = etaNow(busA, originUpdatedAt, dest.updatedAt) + rideMinutes(option.metres);
    }
    const bus = pickBus(candidates, { keys: key ? new Set([key]) : null, expected }) ?? pickBus(candidates, { expected });
    const arrived =
      Boolean(boarded && tracked) &&
      expected != null &&
      expected <= ALERT_MINUTES + 2 &&
      (!bus || bus.time - expected > ARRIVED_SLACK_MIN);
    setTrackedFor(dest.updatedAt);
    if (arrived) setTracked({ ...tracked, arrived: true });
    else setTracked(bus ? { key: lineKey(bus.line), line: bus.line, time: bus.time, at: dest.updatedAt } : null);
  }

  const eta = tracked?.arrived ? 0 : trackedEta != null ? Math.max(0, trackedEta) : null;

  // --- Aviso ---------------------------------------------------------------
  if (boarded && !alarm) {
    const reason = tracked?.arrived ? 'eta' : alertReason({ eta, progress });
    if (reason) {
      setAlarm({
        reason,
        text: alarmText({ reason, eta, remainingMetres: progress?.remainingMetres, alight }),
      });
    }
  }

  useAlarmEffect(live ? alarm : null, { title: t('trip.alert.title'), tag: TRIP_NOTIFICATION_TAG, onEnd });

  const aEta = busA && originUpdatedAt ? Math.max(0, etaNow(busA, originUpdatedAt, now)) : null;

  return {
    phase: alarm ? 'alarm' : boarded ? 'riding' : 'waiting',
    alarm,
    line,
    alight,
    busA,
    aEta,
    selectedKey: selectedKey ?? (busA ? lineKey(busA.line) : null),
    select: setSelectedKey,
    board: () => setBoarded({ how: 'manual', line }),
    eta,
    progress: onRoute || (progress && progress.along == null) ? progress : null,
    gpsStatus: gps.status,
    destStatus: dest.status,
    destError: dest.error ?? null,
  };
}
