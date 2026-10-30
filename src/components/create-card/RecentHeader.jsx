/**
 * Encabezado de la sección "Recientes" dentro de una lista de sugerencias
 * (fila de presentación del listbox, no seleccionable). Sin botón de borrar:
 * cada reciente se borra deslizándola a la izquierda (`SwipeableOption`),
 * como en iOS; a la derecha, una pista discreta de que se puede.
 */
export default function RecentHeader() {
  return (
    <li role="presentation" className="flex items-center justify-between px-3.5 pb-1.5 pt-2.5">
      <span className="text-sm font-semibold text-white/60">Recientes</span>
      <span className="text-xs font-medium text-white/40">Desliza ← para borrar</span>
    </li>
  );
}
