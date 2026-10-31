import { useSyncExternalStore } from 'react';

/**
 * Estado que depende de la hora del dispositivo (Smart Night Mode, momento
 * del día del saludo) como hook de React. Un único temporizador por estado,
 * programado justo para el próximo cambio (`msUntilChange`): si da la hora
 * con la app abierta, todo cambia solo, sin recargar. Al volver a la pestaña
 * se comprueba otra vez (con la pantalla apagada los temporizadores se
 * retrasan). Sin suscriptores, no hay temporizador.
 */
export function createTimeHook(compute, msUntilChange, serverValue) {
  let value = compute();
  let timer = null;
  const listeners = new Set();

  function check() {
    const next = compute();
    if (next === value) return;
    value = next;
    listeners.forEach((listener) => listener());
  }

  function schedule() {
    clearTimeout(timer);
    // +1 s de margen: el temporizador puede adelantarse unos milisegundos.
    timer = setTimeout(() => {
      check();
      schedule();
    }, msUntilChange() + 1_000);
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

  return () => useSyncExternalStore(subscribe, () => value, () => serverValue);
}
