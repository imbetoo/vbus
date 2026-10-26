import { Moon, Sun } from 'lucide-react';
import IconButton from '../ui/IconButton';

const ICON = 'absolute inset-0 h-full w-full transition-[transform,opacity] duration-500 ease-spring motion-reduce:transition-none';

/** Botón Sol/Luna: muestra el tema al que se cambia y gira al alternar. */
export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <IconButton
      tone="adaptive"
      label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      onClick={onToggle}
    >
      <span className="relative h-5 w-5" aria-hidden="true">
        <Sun
          className={`${ICON} ${isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}
          strokeWidth={2.25}
        />
        <Moon
          className={`${ICON} ${isDark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
          strokeWidth={2.25}
        />
      </span>
    </IconButton>
  );
}
