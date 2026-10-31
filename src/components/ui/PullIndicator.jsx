import { RotateCw } from 'lucide-react';
import { useT } from '../../i18n';

const TONES = {
  // Sobre el fondo de la app (Mis rutas): sigue al tema.
  auto: 'bg-white/80 text-black ring-black/10 dark:bg-graphite/90 dark:text-white dark:ring-white/10',
  // Dentro de una hoja grafito (consulta rápida).
  dark: 'bg-white/15 text-white ring-white/10',
};

/**
 * Indicador de "tirar para actualizar": un círculo opaco que baja con la
 * lista. Mientras se tira, aparece y gira según `--pull-progress` (0 → 1); al
 * refrescar, gira sin parar. `usePullToRefresh` escribe las variables CSS en
 * su raíz (`ref`), así no se vuelve a renderizar en cada movimiento y el
 * cambio no se propaga a nada más. Va dentro de una pista `relative` con
 * `overflow-hidden`, encima de la lista.
 */
export default function PullIndicator({ ref, refreshing, tone = 'auto' }) {
  const t = useT();
  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center will-change-[transform,opacity]"
        style={{
          transform: 'translate3d(0, calc(var(--pull, 0px) - 44px), 0) scale(calc(0.6 + 0.4 * var(--pull-progress, 0)))',
          opacity: 'var(--pull-progress, 0)',
          transition: 'var(--pull-transition, none)',
        }}
      >
        <span className={`mt-1.5 flex h-9 w-9 items-center justify-center rounded-full shadow-md shadow-black/10 ring-1 ${TONES[tone]}`}>
          <RotateCw
            className={`h-[18px] w-[18px] ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
            strokeWidth={2.5}
            style={refreshing ? undefined : { transform: 'rotate(calc(var(--pull-progress, 0) * 270deg))' }}
          />
        </span>
      </div>
      {/* Aviso para lectores de pantalla. */}
      <span className="sr-only" role="status">
        {refreshing ? t('pull.refreshing') : ''}
      </span>
    </>
  );
}
