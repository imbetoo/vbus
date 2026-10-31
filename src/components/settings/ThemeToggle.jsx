import { Moon, Sun } from 'lucide-react';
import { useT } from '../../i18n';
import IconButton from '../ui/IconButton';

const ICON = 'absolute inset-0 h-full w-full transition-[transform,opacity] duration-500 ease-spring motion-reduce:transition-none';

/**
 * Botón Sol/Luna: muestra el tema al que se cambia y gira al alternar. Con
 * `lockedBy` (nombre de la paleta que fija el modo, p. ej. Sombra), queda
 * desactivado y explica por qué.
 */
export default function ThemeToggle({ theme, onToggle, lockedBy = null, className = '' }) {
  const isDark = theme === 'dark';
  const t = useT();
  let label = t(isDark ? 'theme.toLight' : 'theme.toDark');
  if (lockedBy) label = t(isDark ? 'theme.locked.dark' : 'theme.locked.light', { name: lockedBy });

  return (
    <IconButton
      tone="adaptive"
      label={label}
      title={lockedBy ? label : undefined}
      aria-disabled={lockedBy ? true : undefined}
      onClick={lockedBy ? undefined : onToggle}
      className={`${className} ${lockedBy ? 'opacity-40' : ''}`}
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
