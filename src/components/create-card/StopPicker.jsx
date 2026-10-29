import { useEffect, useState } from 'react';
import { loadStopsList, searchStops } from '../../data/stops';
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
  // La lista de paradas se carga al montar y, al llegar, se vuelve a buscar
  // lo que ya se haya escrito.
  const [, setStopsLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    loadStopsList()
      .then(() => alive && setStopsLoaded(true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const suggestions = searchStops(query).filter((item) => item.id !== excludeId);

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
