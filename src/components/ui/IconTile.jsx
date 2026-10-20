/** Icono decorativo sobre una pastilla de esquinas redondeadas. */
export default function IconTile({ icon: Icon }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice-100 text-slate-600 dark:bg-white/10 dark:text-steel-300">
      <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
