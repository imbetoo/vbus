import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import StopPicker from '../create-card/StopPicker';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import Sheet from '../ui/Sheet';

/**
 * Buscador de la consulta rápida (lupa de la cabecera): el mismo
 * `StopPicker` que "Nueva tarjeta" (dirección, número o cercanas), pero al
 * elegir una parada solo la devuelve (`onPick(stop)`); no crea ninguna tarjeta.
 */
export default function QuickSearchSheet({ open, onClose, onPick }) {
  const titleId = useId();
  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <QuickSearchForm titleId={titleId} onClose={onClose} onPick={onPick} />
    </Sheet>
  );
}

function QuickSearchForm({ titleId, onClose, onPick }) {
  const [query, setQuery] = useState('');
  // Al abrirse, `<dialog>` enfoca la X: el foco pasa al buscador justo después.
  const inputRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <header className="flex items-start gap-3">
        <IconHeading
          icon={Search}
          iconStrokeWidth={2.5}
          title="Consulta rápida"
          subtitle="Mira los tiempos de una parada sin guardarla"
          titleAs="h2"
          titleId={titleId}
          wrap
        />
        <IconButton icon={X} label="Cerrar" onClick={onClose} className="ml-auto shrink-0" />
      </header>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <StopPicker query={query} onQueryChange={setQuery} onSelect={onPick} inputRef={inputRef} />
      </div>
    </>
  );
}
