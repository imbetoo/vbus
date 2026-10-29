import { useEffect, useState } from 'react';

/**
 * `value` con retardo: cambia cuando deja de cambiar durante `delayMs`. Para
 * no recalcular algo costoso (la búsqueda de paradas) en cada pulsación.
 */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
