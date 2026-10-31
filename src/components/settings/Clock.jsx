import { useState } from 'react';
import { useClock } from '../../hooks/useClock';
import { useT } from '../../i18n';

/**
 * Reloj de la cabecera (`hh:mm`) en Inter con cifras tabulares (ancho fijo:
 * el layout no se mueve al cambiar de dígito). Hereda el color del tema.
 *
 * Al cambiar el minuto, la hora anterior sube y desaparece mientras la nueva
 * entra desde abajo, a la vez, dentro de un contenedor con `overflow: hidden`.
 */
export default function Clock() {
  const t = useT();
  const time = useClock();
  // Hora mostrada y la anterior (solo durante la transición). Se ajusta en
  // render al cambiar `time`, sin efectos.
  const [shown, setShown] = useState({ current: time, previous: null });
  if (time !== shown.current) setShown({ current: time, previous: shown.current });

  return (
    <time
      dateTime={shown.current}
      aria-label={t('header.clock', { time: shown.current })}
      className="relative block overflow-hidden font-sans text-lg font-semibold tracking-tight opacity-80 [font-variant-numeric:tabular-nums]"
    >
      {shown.previous && (
        <span
          key={`out-${shown.previous}`}
          aria-hidden="true"
          className="absolute inset-0 animate-clock-out will-change-transform motion-reduce:hidden"
        >
          {shown.previous}
        </span>
      )}
      <span
        key={shown.current}
        className={`block ${shown.previous ? 'animate-clock-in will-change-transform motion-reduce:animate-none' : ''}`}
      >
        {shown.current}
      </span>
    </time>
  );
}
