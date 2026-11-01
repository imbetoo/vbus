import { useEffect, useSyncExternalStore } from 'react';
import { getLoadedSchedules, loadSchedules, subscribeSchedules } from '../data/schedules';

/**
 * Horarios teóricos (`schedules.json`) o `null` mientras no estén. Con
 * `enabled`, los pide (solo hace falta cuando la API falla); un fallo se
 * reintenta la próxima vez que se active.
 */
export function useSchedules(enabled) {
  const data = useSyncExternalStore(subscribeSchedules, getLoadedSchedules, () => null);
  useEffect(() => {
    if (enabled && !getLoadedSchedules()) loadSchedules().catch(() => {});
  }, [enabled]);
  return data;
}
