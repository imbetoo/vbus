/** Distintivo de la línea con su color (p. ej. "C3" sobre azul). */
export default function LineBadge({ line, color }) {
  return (
    <span
      className={`${color} flex h-10 min-w-[3.25rem] shrink-0 items-center justify-center rounded-xl px-2.5 text-lg font-bold text-white`}
    >
      <span className="sr-only">Línea </span>
      {line}
    </span>
  );
}
