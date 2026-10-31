import { useSyncExternalStore } from 'react';
import en from './en';
import es from './es';
import gl from './gl';

/**
 * Idiomas de la interfaz, sin librerías: tres diccionarios de objetos JS
 * (`es.js` es la fuente; `gl.js` y `en.js` tienen las mismas claves) y un
 * store de módulo. `t(clave, vars)` sirve dentro y fuera de React (avisos,
 * notificaciones); `useT()` además repinta el componente al cambiar de
 * idioma (también los memorizados, que se suscriben por su cuenta).
 *
 * Valores: texto con `{var}` o una función `(vars) => texto` para plurales y
 * concordancias. Si falta una clave, castellano y, si tampoco, la clave.
 * Los nombres de parada y los letreros no se traducen (vienen del GTFS).
 */

export const LANGUAGES = [
  { id: 'gl', name: 'Galego' },
  { id: 'es', name: 'Castellano' },
  { id: 'en', name: 'English' },
];

const DICTIONARIES = { gl, es, en };
const LOCALES = { gl: 'gl-ES', es: 'es-ES', en: 'en-GB' };

/**
 * Idioma del navegador: gallego, castellano (también si pide catalán o
 * euskera) o inglés; cualquier otro, castellano.
 */
export function detectLanguage() {
  const wanted = typeof navigator === 'undefined' ? [] : [...(navigator.languages ?? []), navigator.language];
  for (const tag of wanted) {
    const base = String(tag ?? '').toLowerCase().split('-')[0];
    if (base === 'gl') return 'gl';
    if (base === 'es' || base === 'ca' || base === 'eu') return 'es';
    if (base === 'en') return 'en';
  }
  return 'es';
}

// El elegido en Ajustes (`vbus:settings`) ya en el primer render, sin esperar
// al efecto de `App.jsx` (no se pinta un idioma y luego otro).
function savedLanguage() {
  try {
    const saved = JSON.parse(localStorage.getItem('vbus:settings'))?.language;
    return DICTIONARIES[saved] ? saved : null;
  } catch {
    return null;
  }
}

let current = savedLanguage() ?? detectLanguage();
const listeners = new Set();

/** Preferencia del ajuste "Idioma": `auto` (el del navegador), `gl`, `es` o `en`. */
export function setLanguage(preference) {
  const next = DICTIONARIES[preference] ? preference : detectLanguage();
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** Idioma en uso (`gl`, `es` o `en`). */
export const language = () => current;

/** Locale para fechas, horas y números (`gl-ES`, `es-ES`, `en-GB`). */
export const locale = () => LOCALES[current];

/** Texto de `key` en el idioma en uso, con `{var}` sustituidas. */
export function t(key, vars) {
  const value = DICTIONARIES[current][key] ?? es[key];
  if (value === undefined) return key;
  if (typeof value === 'function') return value(vars ?? {});
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * `t` para componentes: los vuelve a pintar al cambiar de idioma. Devuelve
 * una función distinta por idioma, así sirve también de dependencia.
 */
export function useT() {
  const lang = useSyncExternalStore(subscribe, language, language);
  return BOUND[lang];
}

// Una `t` por idioma (estable): para `useMemo`/`useCallback` que dependan de ella.
const BOUND = Object.fromEntries(Object.keys(DICTIONARIES).map((lang) => [lang, (key, vars) => t(key, vars)]));
