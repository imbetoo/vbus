import { useId } from 'react';
import { useT } from '../../i18n';

/**
 * Campo de texto para el nombre de la tarjeta, con el estilo de los inputs
 * Bento (gris suave, borde fino y anillo azul al enfocar). El `placeholder`
 * muestra el nombre que se usará si se deja vacío. También sirve para la nota
 * (`label`, `maxLength`).
 */
export default function CardNameField({
  value,
  onChange,
  placeholder,
  describedBy,
  label,
  inputRef,
  maxLength = 32,
}) {
  const t = useT();
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-white/80">
        {label ?? t('create.name')}
      </label>
      <input
        id={id}
        type="text"
        ref={inputRef}
        maxLength={maxLength}
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
