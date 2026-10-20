/** Botón circular de solo icono (44×44 pt, el área táctil mínima de Apple). */
export default function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition active:bg-ice-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 dark:text-steel-300 dark:active:bg-white/10 dark:focus-visible:ring-steel-300 ${className}`}
      {...props}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
