import { LoaderCircle, Search } from 'lucide-react';
import { useId } from 'react';

/**
 * Buscador de paradas con el estilo de los campos de búsqueda de iOS. Con
 * `loading` muestra un indicador giratorio a la derecha.
 */
export default function StopSearchField({ value, onChange, loading = false, describedBy }) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Número de parada
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        inputMode="numeric"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Número de parada (p. ej. 3014)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-busy={loading}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-11 pr-11 text-lg font-medium text-white placeholder:font-normal placeholder:text-white/50 transition duration-300 ease-spring focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 [&::-webkit-search-cancel-button]:hidden"
      />
      <LoaderCircle
        className={`pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-white/70 transition-opacity duration-300 motion-reduce:animate-none ${
          loading ? 'opacity-100' : 'opacity-0'
        }`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
    </div>
  );
}
