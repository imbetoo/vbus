import { useSyncExternalStore } from 'react';
import { isNightTime, msUntilNightChange } from '../lib/nightMode';

/**
 * ¿Está activo el Smart Night Mode (23:00–06:00, hora del dispositivo)?
 *
 * Un único temporizador para toda la app, programado justo para el próximo
 * cambio (las 23:00 o las 06:00): si da la hora con la app abierta, todo
 * cambia solo, sin recargar. Al volver a la pestaña se comprueba otra vez
 * (con la pantalla apagada los temporizadores se retrasan).
 */
let night = isNightTime();
let timer = null;
const listeners = new Set();

function check() {
  const next = isNightTime();
  if (next !== night) {
    night = next;
    listeners.forEach((listener) => listener());
  }
}

function schedule() {
  clearTimeout(timer);
  // +1 s de margen: el temporizador puede adelantarse unos milisegundos.
  timer = setTimeout(() => {
    check();
    schedule();
  }, msUntilNightChange() + 1_000);
}

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  check();
  schedule();
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    check();
    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}

export function useNightMode() {
  return useSyncExternalStore(subscribe, () => night, () => false);
}
