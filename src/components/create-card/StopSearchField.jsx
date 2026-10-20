import { Search } from 'lucide-react';
import { useId } from 'react';

/** Buscador de paradas con el estilo de los campos de búsqueda de iOS. */
export default function StopSearchField({ value, onChange }) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Buscar parada
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Dirección o código de parada"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl bg-white/10 pl-11 pr-4 text-lg font-semibold text-white placeholder:font-medium placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/80 [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}
