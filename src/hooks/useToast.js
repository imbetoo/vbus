import { useCallback, useEffect, useState } from 'react';

const TOAST_MS = 2_200;

/**
 * Aviso breve: `[message, show]`. `show(texto)` lo enseña 2,2 s (otro aviso
 * reinicia la cuenta). `initial`: un aviso ya al montar (p. ej. un enlace
 * roto al abrir la app).
 */
export function useToast(initial = null) {
  const [toast, setToast] = useState(() => (initial ? { message: initial } : null));
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  // Un objeto nuevo cada vez: el mismo texto dos veces vuelve a contar.
  const show = useCallback((message) => setToast({ message }), []);
  return [toast?.message ?? null, show];
}
