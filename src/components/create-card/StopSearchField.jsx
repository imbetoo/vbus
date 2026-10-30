import { LoaderCircle, Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import RecentHeader from './RecentHeader';
import StopRow from './StopRow';

// Valor por defecto estable (un `[]` nuevo en cada render rompería la igualdad).
const NO_SUGGESTIONS = [];

/**
 * Buscador de paradas con el estilo de los campos de búsqueda de iOS y
 * autocompletado (combobox accesible): mientras se escribe una dirección
 * ("Conde de Torrecedeira") o un número ("8480"), debajo aparecen las
 * paradas que encajan (`suggestions`). Se eligen con el dedo, o con las
 * flechas y Enter; Escape las cierra. Al elegir una, `onSelect(stop)`.
 * Con `loading` muestra un indicador giratorio a la derecha. Con `recent`, la
 * lista son las paradas recientes (campo vacío) bajo el encabezado
 * "Recientes", con "Borrar" (`onClearRecents`).
 */
export default function StopSearchField({
  value,
  onChange,
  onSelect,
  suggestions = NO_SUGGESTIONS,
  recent = false,
  onClearRecents,
  loading = false,
  describedBy,
  inputRef,
}) {
  const id = useId();
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);
  const open = focused && !dismissed && suggestions.length > 0;
  const activeIndex = Math.min(active, suggestions.length - 1);

  // Con las flechas, la opción activa se mantiene a la vista en la lista con scroll.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const choose = (stop) => {
    setDismissed(true);
    onSelect(stop);
  };

  const onKeyDown = (event) => {
    if (!open) {
      if (event.key === 'ArrowDown' && suggestions.length) setDismissed(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      // Cierra la lista sin cerrar la hoja.
      event.preventDefault();
      event.stopPropagation();
      setDismissed(true);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Dirección o número de parada
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-6 h-5 w-5 -translate-y-1/2 text-white/60"
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <input
        id={id}
        ref={inputRef}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Calle o número de parada"
        value={value}
        onChange={(event) => {
          setDismissed(false);
          setActive(0);
          onChange(event.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        aria-describedby={describedBy}
        aria-busy={loading}
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-11 pr-11 text-lg font-medium text-white placeholder:font-normal placeholder:text-white/50 transition duration-300 ease-spring focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {/* El centrado vertical va en el contenedor: `animate-spin` reescribe el
          `transform` del icono y se comería un `-translate-y-1/2` (el icono
          bajaba en bucle). */}
      <span
        className={`pointer-events-none absolute right-3.5 top-0 flex h-12 items-center transition-opacity duration-300 ${
          loading ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-white/70 motion-reduce:animate-none" strokeWidth={2.5} />
      </span>

      {/* Sugerencias: en el flujo (no flotan) para que la hoja haga scroll si
          hacen falta. `onMouseDown` evita que el input pierda el foco antes del
          clic. */}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={recent ? 'Paradas recientes' : 'Paradas sugeridas'}
          className="mt-2 animate-fade-in divide-y divide-white/10 max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-white/[0.06] motion-reduce:animate-none"
        >
          {recent && <RecentHeader onClear={onClearRecents} />}
          {suggestions.map((stop, index) => (
            <li
              key={stop.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(stop)}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-150 ${
                index === activeIndex ? 'bg-white/10' : ''
              }`}
            >
              <StopRow stop={stop} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

