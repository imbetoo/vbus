import { PRESSABLE } from './pressable';

/**
 * Interruptor de iOS (`role="switch"`): pista verde encendida, gris apagada, y
 * un pulgar blanco que se desliza (solo `transform`). 51 × 31 px como en iOS.
 */
export default function Switch({ checked, onChange, label, describedBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-graphite motion-reduce:transition-none ${PRESSABLE} ${
        checked ? 'bg-[#34C759]' : 'bg-white/20'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md shadow-black/30 transition-transform duration-300 ease-spring motion-reduce:transition-none ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
