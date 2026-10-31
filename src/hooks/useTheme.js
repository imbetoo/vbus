import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { chosenTheme } from '../lib/appearance';
import { prefersReducedMotion } from '../lib/motion';

const STORAGE_KEY = 'vbus:theme';

/**
 * Tema claro/oscuro: aplica la clase `dark` en <html> y recuerda la elección.
 *
 * `forced` (`light`/`dark`): lo fija la paleta (Sombra, Cyberpunk y OLED son
 * oscuras; Nube, clara). Mientras tanto manda ella, el Sol/Luna no hace nada
 * y la elección guardada no se toca: vuelve al elegir otra paleta.
 *
 * Devuelve `{ theme, forced, toggleTheme }` (`theme`: el que se ve).
 */
export function useTheme(forced = null) {
  const [chosen, setTheme] = useState(chosenTheme);
  const theme = forced ?? chosen;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (forced) return;
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
  }, [theme, forced]);

  return { theme, forced, toggleTheme };
}
