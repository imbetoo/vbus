/** Icono decorativo sobre una pastilla grafito de esquinas redondeadas. */
export default function IconTile({ icon: Icon, strokeWidth = 2 }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-graphite text-white">
      <Icon className="h-6 w-6" strokeWidth={strokeWidth} aria-hidden="true" />
    </span>
  );
}
