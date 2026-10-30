import { ScanQrCode } from 'lucide-react';
import { useState } from 'react';
import { addRecentStop, clearRecentStops, useRecentStops } from '../../data/recentStops';
import { useStopSearch } from '../../hooks/useStopSearch';
import ScannerSheet from '../scanner/ScannerSheet';
import { PRESSABLE } from '../ui/pressable';
import NearbyStops from './NearbyStops';
import StopSearchField from './StopSearchField';

/**
 * Selector de parada reutilizable: buscador predictivo (dirección o número,
 * sobre las 1157 paradas), "Paradas cerca de mí" y escáner del QR de la
 * marquesina (`ScannerSheet`). Con el buscador vacío y enfocado enseña las
 * paradas recientes (`useRecentStops`); cada parada elegida, venga de donde
 * venga, sube al historial. Solo devuelve la parada
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
  const [scanning, setScanning] = useState(false);
  // Con el campo vacío, las recientes (sin la ya elegida).
  const recents = useRecentStops();
  const recentOptions = recents.filter((stop) => stop.id !== excludeId);
  const showRecents = !query.trim() && recentOptions.length > 0;
  const select = (stop) => {
    addRecentStop(stop);
    onSelect(stop);
  };

  return (
    <>
      <StopSearchField
        value={query}
        onChange={onQueryChange}
        onSelect={select}
        suggestions={showRecents ? recentOptions : suggestions}
        recent={showRecents}
        onClearRecents={clearRecentStops}
        loading={loading}
        describedBy={describedBy}
        inputRef={inputRef}
      />
      {children?.(suggestions.length)}
      <NearbyStops onSelect={select} />
      {/* Escáner del QR de la marquesina: elige la parada sin teclear. */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setScanning(true)}
        className={`mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 text-base font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
      >
        <ScanQrCode className="h-5 w-5 text-accent" strokeWidth={2.5} aria-hidden="true" />
        Escanear QR de la parada
      </button>
      <ScannerSheet
        open={scanning}
        onClose={() => setScanning(false)}
        onScan={(stop) => {
          setScanning(false);
          select(stop);
        }}
      />
    </>
  );
}
