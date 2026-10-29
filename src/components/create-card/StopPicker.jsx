import { useStopSearch } from '../../hooks/useStopSearch';
import NearbyStops from './NearbyStops';
import StopSearchField from './StopSearchField';

/**
 * Selector de parada reutilizable: buscador predictivo (dirección o número,
 * sobre las 1157 paradas) y "Paradas cerca de mí". Solo devuelve la parada
 * elegida con `onSelect(stop)` (`{ id, name, lines? }`); quien lo usa decide
 * qué hacer con ella (crear una tarjeta, abrir una consulta rápida…).
 *
 * `query` / `onQueryChange`: el texto del buscador, controlado por el padre.
 * `excludeId`: parada que no se sugiere (la ya elegida). `children(count)`:
 * mensaje opcional entre el buscador y el botón de cercanas, que recibe
 * cuántas sugerencias hay.
 */
export default function StopPicker({
  query,
  onQueryChange,
  onSelect,
  excludeId,
  loading = false,
  describedBy,
  inputRef,
  children,
}) {
  // Búsqueda con debounce de 200 ms y memorizada (`useStopSearch`).
  const { suggestions } = useStopSearch(query, { excludeId });

  return (
    <>
      <StopSearchField
        value={query}
        onChange={onQueryChange}
        onSelect={onSelect}
        suggestions={suggestions}
        loading={loading}
        describedBy={describedBy}
        inputRef={inputRef}
      />
      {children?.(suggestions.length)}
      <NearbyStops onSelect={onSelect} />
    </>
  );
}
