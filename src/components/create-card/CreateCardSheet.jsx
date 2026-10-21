import { BusFront, Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import Sheet from '../ui/Sheet';
import LineChips from './LineChips';
import StepSection from './StepSection';
import StopSearchField from './StopSearchField';

/** Hoja "Nueva tarjeta": elegir parada y después sus líneas. */
export default function CreateCardSheet({ open, onClose }) {
  const titleId = useId();

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <CreateCardForm titleId={titleId} onClose={onClose} />
    </Sheet>
  );
}

function CreateCardForm({ titleId, onClose }) {
  const [openStep, setOpenStep] = useState(null);
  const [query, setQuery] = useState('');
  // Fase 2: se fijará al elegir un resultado de la búsqueda en VigoBusAPI.
  const [stop] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);

  const toggleStep = (step) => setOpenStep((current) => (current === step ? null : step));
  const toggleLine = (line) =>
    setSelectedLines((current) =>
      current.includes(line) ? current.filter((l) => l !== line) : [...current, line],
    );
  const canCreate = stop !== null && selectedLines.length > 0;

  return (
    <>
      <header className="flex items-start gap-3">
        <IconHeading
          icon={Plus}
          iconStrokeWidth={2.75}
          title="Nueva tarjeta"
          subtitle="Asigna la parada y línea que quieras"
          titleAs="h2"
          titleId={titleId}
          wrap
        />
        <IconButton icon={X} label="Cerrar" onClick={onClose} className="ml-auto shrink-0" />
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <StepSection
          icon={BusFront}
          title="Selecciona la parada"
          subtitle="Busca por dirección o por código"
          open={openStep === 'stop'}
          onToggle={() => toggleStep('stop')}
        >
          <StopSearchField value={query} onChange={setQuery} />
          <p className="mt-3 text-sm font-medium text-white/60">
            La búsqueda de paradas llegará con los datos en tiempo real.
          </p>
        </StepSection>

        <StepSection
          icon={BusFront}
          title="Escoge la(s) línea(s)"
          subtitle="Mira las líneas que pasan por tu parada"
          open={openStep === 'lines'}
          onToggle={() => toggleStep('lines')}
        >
          {stop ? (
            <LineChips lines={stop.lines} selected={selectedLines} onToggle={toggleLine} />
          ) : (
            <p className="text-base font-medium text-white/70">Selecciona primero una parada.</p>
          )}
        </StepSection>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          disabled={!canCreate}
          className="h-14 w-full rounded-2xl bg-white text-lg font-semibold text-black transition duration-300 ease-spring active:scale-[0.98] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-graphite disabled:opacity-40"
        >
          Crear tarjeta
        </button>
      </div>
    </>
  );
}
