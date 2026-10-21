import { useCallback, useEffect, useState } from 'react';

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
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: el cambio dura solo esta sesión.
    }
    setTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
