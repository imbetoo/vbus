import { useId } from 'react';

/**
 * Campo de texto para el nombre de la tarjeta, con el estilo de los inputs
 * Bento (gris suave, borde fino y anillo azul al enfocar). El `placeholder`
 * muestra el nombre que se usará si se deja vacío.
 */
export default function CardNameField({
  value,
  onChange,
  placeholder,
  describedBy,
  label = 'Nombre de la tarjeta',
  inputRef,
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-white/80">
        {label}
      </label>
      <input
        id={id}
        type="text"
        ref={inputRef}
        maxLength={32}
        enterKeyHint="done"
        autoComplete="off"
        autoCapitalize="sentences"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={describedBy}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-lg font-medium text-white placeholder:font-normal placeholder:text-white/50 transition duration-300 ease-spring focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
    </div>
  );
}
