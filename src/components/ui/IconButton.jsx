/** Botón circular de solo icono (44×44 pt, el área táctil mínima de Apple). */
export default function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition duration-300 ease-spring active:scale-95 active:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
      {...props}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}
