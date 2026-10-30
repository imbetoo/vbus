import { Navigation } from 'lucide-react';
import { useEffect } from 'react';
import { Fragment } from 'react';
import RecentHeader from '../create-card/RecentHeader';
import StopRow from '../create-card/StopRow';

/** `id` de la opción "Mi ubicación actual" de la lista del origen (vuelve al GPS). */
export const CURRENT_LOCATION_ID = 'current-location';

/**
 * Sugerencias del campo que se está editando (listbox del combobox): las
 * paradas que encajan con lo escrito y, en el origen, "Mi ubicación actual"
 * la primera. Se eligen con el dedo o con flechas + Enter (el teclado lo lleva
 * el campo, que apunta aquí con `aria-activedescendant`).
 *
 * Con el campo vacío, las paradas recientes llevan encima el encabezado
 * "Recientes" (desde `recentFrom`) con "Borrar" (`onClearRecents`).
 *
 * `onMouseDown` evita que el campo pierda el foco antes del clic.
 */
export default function StopSuggestions({
  id,
  label,
  options,
  activeIndex,
  hint,
  recentFrom = -1,
  onClearRecents,
  onChoose,
  onActivate,
}) {
  // Con las flechas, la opción activa se mantiene a la vista.
  useEffect(() => {
    document.getElementById(`${id}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, activeIndex]);

  return (
    <div className="animate-fade-in motion-reduce:animate-none">
      {options.length > 0 && (
        <ul
          id={id}
          role="listbox"
          aria-label={label}
          className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]"
        >
          {options.map((option, index) => (
            <Fragment key={option.id}>
              {index === recentFrom && <RecentHeader onClear={onClearRecents} />}
              <li
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChoose(option)}
                onMouseEnter={() => onActivate(index)}
                className={`flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-150 ${
                  index === activeIndex ? 'bg-white/10' : ''
                }`}
              >
                {option.id === CURRENT_LOCATION_ID ? (
                  <>
                    <Navigation className="h-5 w-5 shrink-0 fill-accent text-accent" strokeWidth={2} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base/snug font-medium text-[#409CFF]">Mi ubicación actual</span>
                      <span className="mt-0.5 block truncate text-sm font-medium text-white/60">
                        Sale de la parada más cercana a ti
                      </span>
                    </span>
                  </>
                ) : (
                  <StopRow stop={option} />
                )}
              </li>
            </Fragment>
          ))}
        </ul>
      )}
      {hint && (
        <p key={hint} className="mt-3 animate-fade-in px-1 text-sm font-medium text-white/60 motion-reduce:animate-none">
          {hint}
        </p>
      )}
    </div>
  );
}
