/** Minutos que faltan para la llegada, en grande. En rojo si es urgente. */
export default function ArrivalTime({ minutes, urgent }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="sr-only">Llega en </span>
      <span
        className={`inline-block min-w-[2ch] text-right text-4xl font-bold leading-none tracking-tight tabular-nums ${
          urgent ? 'text-urgent dark:text-urgent-dark' : 'text-navy-900 dark:text-white'
        }`}
      >
        {minutes}
      </span>
      <span
        className={`text-sm font-medium ${
          urgent ? 'text-urgent dark:text-urgent-dark' : 'text-slate-600 dark:text-steel-300'
        }`}
      >
        min
      </span>
    </span>
  );
}
