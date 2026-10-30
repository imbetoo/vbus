/**
 * Encabezado de la sección "Recientes" dentro de una lista de sugerencias
 * (fila de presentación del listbox, no seleccionable), con "Borrar" para
 * vaciar el historial. `onMouseDown` evita que el campo pierda el foco.
 */
export default function RecentHeader({ onClear }) {
  return (
    <li role="presentation" className="flex items-center justify-between px-3.5 pb-1.5 pt-2.5">
      <span className="text-sm font-semibold text-white/60">Recientes</span>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClear}
        className="rounded-full px-2 py-1 text-sm font-medium text-accent transition-opacity duration-150 active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Borrar
      </button>
    </li>
  );
}
