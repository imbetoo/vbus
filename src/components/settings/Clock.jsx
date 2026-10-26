import { useClock } from '../../hooks/useClock';

/**
 * Reloj de la cabecera (`hh:mm`). Hereda el color del tema; cuando cambia el
 * minuto, la hora nueva entra con un fundido suave (`key` la vuelve a montar).
 */
export default function Clock() {
  const time = useClock();

  return (
    <time
      dateTime={time}
      aria-label={`Son las ${time}`}
      className="block text-lg font-semibold tabular-nums tracking-tight opacity-80"
    >
      <span key={time} className="inline-block animate-clock-in motion-reduce:animate-none">
        {time}
      </span>
    </time>
  );
}
