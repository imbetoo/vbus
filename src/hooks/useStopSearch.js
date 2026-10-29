import { useEffect, useMemo, useState } from 'react';
import { loadStopsList, searchStops } from '../data/stops';
import { useDebouncedValue } from './useDebouncedValue';

// Espera tras la última pulsación antes de buscar: en un móvil modesto, buscar
// en cada letra satura la CPU.
const DEBOUNCE_MS = 200;

/**
 * Búsqueda predictiva de paradas para un campo de texto (`searchStops` sobre
 * las 1157 paradas). El texto del campo responde al momento; la búsqueda
 * espera a que se deje de teclear 200 ms y se memoriza (`useMemo`), así un
 * re-render que no cambia el texto no vuelve a buscar. Con el campo vacío no
 * se espera: la lista se vacía ya.
 *
 * Devuelve `{ suggestions, pending }`: `pending` mientras falta por buscar lo
 * último escrito (o aún no ha llegado la lista), para no anunciar "sin
 * resultados" antes de tiempo. `excludeId`: parada que no se sugiere.
 */
export function useStopSearch(query, { excludeId } = {}) {
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

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const searchQuery = query.trim() ? debouncedQuery : '';
  const suggestions = useMemo(
    () => searchStops(searchQuery).filter((item) => item.id !== excludeId),
    // `stopsLoaded`: al llegar la lista hay que volver a buscar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchQuery, excludeId, stopsLoaded],
  );
  const pending = Boolean(query.trim()) && (searchQuery !== query || !stopsLoaded);

  return { suggestions, pending };
}
