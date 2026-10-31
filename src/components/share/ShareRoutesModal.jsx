import { Copy, Share, Share2, X } from 'lucide-react';
import { useId, useMemo } from 'react';
import { haptics } from '../../lib/haptics';
import { routesShareUrl } from '../../lib/routesShare';
import { copyText, shareContent } from '../../lib/share';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import { useToast } from '../../hooks/useToast';
import Toast from '../ui/Toast';
import { PRESSABLE } from '../ui/pressable';
import QrCode from './QrCode';
import RoutesPreview from './RoutesPreview';
import { useT } from '../../i18n';

const CAN_SHARE = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
// Icono de compartir del sistema: el de iOS/macOS en Apple y el de Android en el resto.
const SHARE_ICON =
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? Share : Share2;

/**
 * "Compartir mis rutas": un QR con el enlace que lleva todas las tarjetas
 * (`routesShareUrl`, sin backend) para escanearlo con la cámara del otro
 * móvil, la lista de lo que se comparte y dos acciones: el menú nativo de
 * compartir (si existe) y "Copiar enlace" (toque háptico ligero y aviso).
 */
export default function ShareRoutesModal({ open, onClose, routes }) {
  const t = useT();
  const titleId = useId();
  const [toast, showToast] = useToast();
  const url = useMemo(() => (routes.length ? routesShareUrl(routes) : ''), [routes]);
  const entries = useMemo(
    () => routes.map((route) => ({ stopId: route.stopId, alias: route.alias ?? '', lines: route.lines ?? [] })),
    [routes],
  );

  const copy = async () => {
    haptics.select();
    showToast((await copyText(url)) ? t('share.routes.copied') : t('share.routes.copyFailed'));
  };

  const share = async () => {
    const result = await shareContent({
      title: t('share.routes.shareTitle'),
      text: t('share.routes.text', { n: routes.length, url }),
    });
    if (result === 'copied') showToast(t('share.routes.copied'));
    else if (result === 'failed') showToast(t('share.routes.shareFailed'));
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      <div className="relative flex max-h-[calc(100dvh-2rem)] transform-gpu flex-col gap-4 overflow-y-auto overscroll-contain p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
              {t('share.routes.title')}
            </h2>
            <p className="mt-1 text-sm font-medium text-white/60">
              {t('share.routes.subtitle', { n: routes.length })}
            </p>
          </div>
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </header>

        {url && (
          <div className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-3xl bg-white p-3 shadow-relief">
            <QrCode value={url} label={t('share.routes.qr', { n: routes.length })} className="aspect-square w-full" />
          </div>
        )}

        <RoutesPreview entries={entries} />

        <div className="flex flex-col gap-2">
          {CAN_SHARE && (
            <PillButton onClick={share}>
              <SHARE_ICON className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              {t('share.routes.share')}
            </PillButton>
          )}
          <button
            type="button"
            onClick={copy}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
          >
            <Copy className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {t('share.routes.copy')}
          </button>
        </div>

        {/* Dentro del diálogo: fuera, la página está inerte y quedaría debajo. */}
        <Toast message={toast} className="sticky bottom-0 mx-auto -mt-2" />
      </div>
    </Modal>
  );
}
