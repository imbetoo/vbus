import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'vbus:settings';

/**
 * Ajustes por defecto: cómo se ordenan los autobuses de las tarjetas. (Cuántos
 * se ven lo elige cada tarjeta al crearla.)
 */
export const DEFAULT_SETTINGS = { sortBy: 'time' };

const VALID = {
  sortBy: ['time', 'preference'],
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
