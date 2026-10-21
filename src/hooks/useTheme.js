import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { prefersReducedMotion } from '../lib/motion';

const STORAGE_KEY = 'vbus:theme';

// Misma regla que el script de `index.html`: la elección guardada manda y, si
// no la hay, se sigue al sistema.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Sin almacenamiento disponible: se sigue al sistema.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Tema claro/oscuro: aplica la clase `dark` en <html> y recuerda la elección. */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: el cambio dura solo esta sesión.
    }

    const apply = () => {
      root.classList.toggle('dark', next === 'dark');
      flushSync(() => setTheme(next));
    };

    // Sin View Transitions (o con movimiento reducido) el cambio es inmediato.
    if (!document.startViewTransition || prefersReducedMotion()) {
      apply();
      return;
    }
    // Fundido de la página entera en 500 ms (ver `index.css`).
    root.classList.add('theme-switching');
    document
      .startViewTransition(apply)
      .finished.finally(() => root.classList.remove('theme-switching'));
  }, [theme]);

  return { theme, toggleTheme };
}
