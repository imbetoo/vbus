import { createTimeHook } from '../lib/timeStore';
import { isNightTime, msUntilNightChange } from '../lib/nightMode';

/**
 * ¿Está activo el Smart Night Mode (23:00–06:00, hora del dispositivo)? Cambia
 * solo a las 23:00 y a las 06:00 con la app abierta (`createTimeHook`).
 */
export const useNightMode = createTimeHook(isNightTime, msUntilNightChange, false);
