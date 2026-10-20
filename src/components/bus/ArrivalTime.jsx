/** Minutos que faltan para la llegada ("Llegando" a 0). En rojo si es urgente. */
export default function ArrivalTime({ minutes, urgent }) {
  return (
    <span
      className={`whitespace-nowrap text-lg font-bold tabular-nums ${urgent ? 'text-urgent' : 'text-white'}`}
    >
      {minutes <= 0 ? (
        'Llegando'
      ) : (
        <>
          <span className="sr-only">Llega en </span>
          {minutes} min
        </>
      )}
    </span>
  );
}
