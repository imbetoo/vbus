/**
 * Icono decorativo sobre una pastilla de esquinas redondeadas. `tone` cambia
 * fondo y color del icono (por defecto grafito con icono blanco; ver
 * `cardColors.js`). Lleva el relieve sutil de las pastillas de color.
 */
export default function IconTile({ icon: Icon, strokeWidth = 2, tone = 'bg-graphite text-white' }) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-relief transition-colors duration-300 ${tone}`}
    >
      <Icon className="h-6 w-6" strokeWidth={strokeWidth} aria-hidden="true" />
    </span>
  );
}
