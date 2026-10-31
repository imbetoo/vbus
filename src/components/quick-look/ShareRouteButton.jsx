import { Share, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { routeShareText, routeShareUrl, shareContent } from '../../lib/share';
import IconButton from '../ui/IconButton';
import { useT } from '../../i18n';

// Icono de compartir del sistema: el de iOS/macOS (caja con flecha) en Apple y
// el de Android en el resto.
const SHARE_ICON =
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? Share : Share2;
const TOAST_MS = 2_200;

// Aviso según el resultado (los demás no avisan).
const TOASTS = {
  copied: 'share.route.copied',
  failed: 'share.route.failed',
};

/**
 * Botón sutil para compartir un trayecto directo (`shareContent`): menú
 * nativo con el texto y un enlace que abre la app con el mismo Origen y
 * Destino; si no hay menú nativo, se copia y un aviso lo confirma. Cancelar
 * el menú no avisa de nada.
 */
export default function ShareRouteButton({ origin, destination, lines }) {
  const t = useT();
  const [toast, setToast] = useState(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const share = async () => {
    // Un doble toque no abre dos menús (el segundo fallaría con InvalidStateError).
    if (busy.current) return;
    busy.current = true;
    const url = routeShareUrl(origin, destination);
    const result = await shareContent({
      title: t('share.route.title'),
      text: routeShareText({ origin, destination, lines, url }),
    });
    busy.current = false;
    if (TOASTS[result]) setToast(result);
  };

  return (
    <div className="relative">
      <IconButton icon={SHARE_ICON} size="sm" label={t('share.route.button')} onClick={share} />
      <p
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-black shadow-lg shadow-black/30 transition-[transform,opacity] duration-300 ease-spring motion-reduce:transition-none ${
          toast ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
      >
        {toast ? t(TOASTS[toast]) : ''}
      </p>
    </div>
  );
}
