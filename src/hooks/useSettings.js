import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'vbus:settings';

/**
 * Ajustes por defecto:
 * - `sortBy`: cómo se ordenan los autobuses de las tarjetas (cuántos se ven lo
 *   elige cada tarjeta al crearla).
 * - `background`: fondo completo o ligero (menos manchas, para móviles con tirones).
 * - `timeFormat`: llegadas en minutos que faltan ("5 min") o a la hora ("12:45").
 * - `refreshSeconds`: cada cuánto se piden de nuevo los tiempos (15, 30 o 60 s).
 * - `sortByProximity`: la tarjeta de la parada más cercana, la primera
 *   (Smart Sorting; solo cambia la vista, nunca el orden guardado).
 * - `vibration`: vibración y toques hápticos (también los de las alarmas).
 */
export const DEFAULT_SETTINGS = {
  sortBy: 'time',
  background: 'full',
  timeFormat: 'relative',
  refreshSeconds: 30,
  sortByProximity: true,
  vibration: true,
};

const VALID = {
  sortBy: ['time', 'preference'],
  background: ['full', 'lite'],
  timeFormat: ['relative', 'absolute'],
  refreshSeconds: [15, 30, 60],
  sortByProximity: [true, false],
  vibration: [true, false],
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Solo se aceptan valores conocidos: un dato viejo o corrupto no rompe la app.
    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [
        key,
        VALID[key].includes(saved?.[key]) ? saved[key] : fallback,
      ]),
    );
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Ajustes globales de la app, guardados en LocalStorage. */
export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Sin almacenamiento: los ajustes duran solo esta sesión.
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => setSettings((current) => ({ ...current, [key]: value })), []);

  return { settings, updateSetting };
}
