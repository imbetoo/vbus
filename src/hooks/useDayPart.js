import { dayPart, msUntilDayPartChange } from '../lib/dayPart';
import { createTimeHook } from '../lib/timeStore';

/** Momento del día del saludo (`morning`, `afternoon`, `evening`); cambia solo. */
export const useDayPart = createTimeHook(dayPart, msUntilDayPartChange, 'morning');
