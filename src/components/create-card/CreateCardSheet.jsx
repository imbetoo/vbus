import { BusFront, CircleAlert, CircleCheck, Plus, Route, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useStopLookup } from '../../hooks/useStopLookup';
import { toRouteCard, uniqueLines } from '../../services/vigobusAdapter';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import PillButton from '../ui/PillButton';
import SegmentedControl from '../ui/SegmentedControl';
import Sheet from '../ui/Sheet';
import { DEFAULT_CARD_COLOR } from '../bus/cardColors';
import CardNameField from './CardNameField';
import ColorPicker from './ColorPicker';
import LineChips from './LineChips';
import StepSection from './StepSection';
import StopSearchField from './StopSearchField';

/** Hoja "Nueva tarjeta": elegir parada y después sus líneas. */
export default function CreateCardSheet({ open, onClose, onCreate }) {
  const titleId = useId();

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <CreateCardForm titleId={titleId} onClose={onClose} onCreate={onCreate} />
    </Sheet>
  );
}

function lookupErrorMessage(error, query) {
  if (error?.kind === 'not_found') return `No existe la parada ${query.trim()}. Revisa el número de la marquesina.`;
  if (error?.kind === 'upstream') return 'Vitrasa no responde ahora mismo. Inténtalo en un momento.';
  return 'No se pudo conectar con el servicio de autobuses. Inténtalo de nuevo.';
}

// Tipo de mensaje bajo el buscador (cargar mantiene la ayuda, sin parpadeo).
function statusKind(lookup) {
  if (lookup.status === 'error' || lookup.status === 'success' || lookup.status === 'invalid') return lookup.status;
  return 'hint';
}

const BUSES_OPTIONS = [
  { value: 2, label: '2 autobuses' },
  { value: 3, label: '3 autobuses' },
];

function StopStatus({ id, lookup, query }) {
  if (lookup.status === 'error') {
    return (
      <p id={id} className="mt-3 flex animate-fade-in items-start gap-2 rounded-2xl border border-urgent/30 bg-urgent/10 px-3.5 py-2.5 text-sm font-medium text-red-200 motion-reduce:animate-none">
        <CircleAlert className="mt-px h-4 w-4 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
        {lookupErrorMessage(lookup.error, query)}
      </p>
    );
  }
  if (lookup.status === 'success') {
    const count = uniqueLines(lookup.buses).length;
    return (
      <p id={id} className="mt-3 flex animate-fade-in items-center gap-2 text-sm font-medium text-white/80 motion-reduce:animate-none">
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
        <span className="truncate">
          {lookup.stop.name} · {count} {count === 1 ? 'línea' : 'líneas'}
        </span>
      </p>
    );
  }
  return (
    <p id={id} className="mt-3 animate-fade-in text-sm font-medium text-white/60 motion-reduce:animate-none">
      {lookup.status === 'invalid'
        ? 'De momento solo se puede buscar por número de parada.'
        : 'Escribe el número que aparece en la marquesina de la parada.'}
    </p>
  );
}

function CreateCardForm({ titleId, onClose, onCreate }) {
  // Los pasos se abren por separado: al encontrar la parada, "líneas" se
  // despliega sin plegar el buscador (que tiene el foco mientras se escribe).
  const [openSteps, setOpenSteps] = useState({ stop: false, lines: false, customize: false });
  const [query, setQuery] = useState('');
  const lookup = useStopLookup(query);
  const stop = lookup.status === 'success' ? lookup.stop : null;
  const lines = stop ? uniqueLines(lookup.buses) : [];

  // La selección pertenece a una parada concreta: si cambia, empieza vacía.
  const [selection, setSelection] = useState({ stopId: null, lines: [] });
  const selectedLines = stop && selection.stopId === stop.id ? selection.lines : [];

  // Al llegar una parada nueva, se despliega "Escoge la(s) línea(s)" una vez
  // (estado ajustado durante el render, sin efectos).
  const [autoOpenedFor, setAutoOpenedFor] = useState(null);
  if (stop && autoOpenedFor !== stop.id) {
    setAutoOpenedFor(stop.id);
    setOpenSteps((current) => ({ ...current, lines: true }));
  }

  // Personalización de esta tarjeta: nombre (vacío = nombre de la parada) y
  // cuántos autobuses enseña sin desplegar.
  const [name, setName] = useState('');
  const [busesToShow, setBusesToShow] = useState(3);
  const [color, setColor] = useState(DEFAULT_CARD_COLOR);
  // Al elegir la primera línea se despliega "Personaliza la tarjeta" una vez.
  const [customizeOpened, setCustomizeOpened] = useState(false);
  if (selectedLines.length > 0 && !customizeOpened) {
    setCustomizeOpened(true);
    setOpenSteps((current) => ({ ...current, customize: true }));
  }

  const statusId = useId();
  const nameHintId = useId();
  const cardName = name.trim() || stop?.name || '';
  const toggleStep = (step) => setOpenSteps((current) => ({ ...current, [step]: !current[step] }));
  const toggleLine = (line) =>
    setSelection({
      stopId: stop.id,
      lines: selectedLines.includes(line) ? selectedLines.filter((l) => l !== line) : [...selectedLines, line],
    });
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
          subtitle={stop ? `Parada ${stop.id} · ${stop.name}` : 'Busca por dirección o por código'}
          open={openSteps.stop}
          onToggle={() => toggleStep('stop')}
        >
          <StopSearchField
            value={query}
            onChange={setQuery}
            loading={lookup.status === 'loading'}
            describedBy={statusId}
          />
          <div aria-live="polite">
            {/* `key` por tipo de mensaje: al cambiar, el nuevo entra con un fundido. */}
            <StopStatus key={statusKind(lookup)} id={statusId} lookup={lookup} query={query} />
          </div>
        </StepSection>

        <StepSection
          icon={Route}
          title="Escoge la(s) línea(s)"
          subtitle={
            selectedLines.length
              ? `${selectedLines.length} ${selectedLines.length === 1 ? 'línea elegida' : 'líneas elegidas'}`
              : 'Mira las líneas que pasan por tu parada'
          }
          open={openSteps.lines}
          onToggle={() => toggleStep('lines')}
        >
          {stop ? (
            <div key="lines" className="animate-fade-in motion-reduce:animate-none">
              <LineChips lines={lines} selected={selectedLines} onToggle={toggleLine} />
              <p className="mt-3 text-sm font-medium text-white/60">
                Toca tus líneas en orden de preferencia: la primera saldrá arriba.
              </p>
            </div>
          ) : (
            <p key="empty" className="animate-fade-in text-base font-medium text-white/70 motion-reduce:animate-none">
              Selecciona primero una parada.
            </p>
          )}
        </StepSection>

        <StepSection
          icon={SlidersHorizontal}
          title="Personaliza la tarjeta"
          subtitle={`${cardName ? `${cardName} · ` : ''}${busesToShow} visibles`}
          open={openSteps.customize}
          onToggle={() => toggleStep('customize')}
        >
          <CardNameField
            value={name}
            onChange={setName}
            placeholder={stop ? stop.name : 'Ej. Ir al instituto'}
            describedBy={nameHintId}
          />
          <p id={nameHintId} className="mt-2 text-sm font-medium text-white/60">
            Si lo dejas vacío, se usará el nombre de la parada.
          </p>

          <p className="mb-2 mt-4 text-sm font-semibold text-white/80" aria-hidden="true">
            Autobuses visibles
          </p>
          <SegmentedControl
            label="Autobuses visibles en esta tarjeta"
            options={BUSES_OPTIONS}
            value={busesToShow}
            onChange={setBusesToShow}
          />

          <div className="mt-4">
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </StepSection>
      </div>

      <div className="mt-auto pt-6">
        <PillButton
          disabled={!canCreate}
          onClick={() =>
            onCreate(toRouteCard({ stop, buses: lookup.buses, lines: selectedLines, title: name, busesToShow, color }))
          }
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          Crear tarjeta
        </PillButton>
      </div>
    </>
  );
}
