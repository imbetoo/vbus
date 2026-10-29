import { useEffect, useMemo, useState } from 'react';
import { loadStopsList, searchStops } from '../../data/stops';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
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
  // La lista de paradas suele estar ya precargada (`App.jsx`); si no, se
  // carga al montar y, al llegar, se vuelve a buscar lo que ya se haya escrito.
  const [stopsLoaded, setStopsLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    loadStopsList()
      .then(() => alive && setStopsLoaded(true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // El texto del campo responde al momento; la búsqueda espera a que se deje
  // de teclear 200 ms (en un móvil modesto, buscar en cada letra satura la
  // CPU). Con el campo vacío no se espera: la lista se cierra ya.
  const debouncedQuery = useDebouncedValue(query, 200);
  const searchQuery = query.trim() ? debouncedQuery : '';
  const suggestions = useMemo(
    () => searchStops(searchQuery).filter((item) => item.id !== excludeId),
    // `stopsLoaded`: al llegar la lista hay que volver a buscar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchQuery, excludeId, stopsLoaded],
  );

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
