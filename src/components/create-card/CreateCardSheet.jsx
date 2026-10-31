import { BusFront, CircleAlert, CircleCheck, Plus, Route, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { loadStopsList, stopLines } from '../../data/stops';
import { useStopLookup } from '../../hooks/useStopLookup';
import { NOTE_MAX, lineColor, toRouteCard, uniqueLines } from '../../services/vigobusAdapter';
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
import StopPicker from './StopPicker';
import { t, useT } from '../../i18n';

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
  if (error?.kind === 'offline') return t('error.offline');
  if (error?.kind === 'not_found') return t('error.notFound', { stop: query.trim() });
  if (error?.kind === 'upstream') return t('error.upstream');
  if (error?.kind === 'timeout') return t('error.timeout');
  if (error?.kind === 'network') return t('error.network');
  return t('error.generic');
}

// Tipo de mensaje bajo el buscador (cargar mantiene la ayuda, sin parpadeo).
function statusKind(lookup) {
  if (lookup.status === 'error' || lookup.status === 'success' || lookup.status === 'invalid') return lookup.status;
  return 'hint';
}

const BUSES_OPTIONS = [2, 3];

/**
 * Líneas que se pueden elegir en una parada: las teóricas de los datos
 * abiertos (`stopsList.json`), circulen o no ahora (a las 23:20 no pasan
 * todas y la tarjeta puede ser para mañana). Solo si la parada no está en la
 * lista (nueva), las que llegan ahora según la API.
 */
function selectableLines(stop, buses) {
  const known = stopLines(stop.id);
  return known.length ? known.map((line) => ({ line, color: lineColor(line) })) : uniqueLines(buses);
}

function StopStatus({ id, lookup, lines, query, suggestionCount }) {
  const t = useT();
  if (lookup.status === 'error') {
    return (
      <p id={id} className="mt-3 flex animate-fade-in items-start gap-2 rounded-2xl border border-urgent/30 bg-urgent/10 px-3.5 py-2.5 text-sm font-medium text-red-200 motion-reduce:animate-none">
        <CircleAlert className="mt-px h-4 w-4 shrink-0 text-urgent" strokeWidth={2.5} aria-hidden="true" />
        {lookupErrorMessage(lookup.error, query)}
      </p>
    );
  }
  if (lookup.status === 'success') {
    const count = lines.length;
    return (
      <p id={id} className="mt-3 flex animate-fade-in items-center gap-2 text-sm font-medium text-white/80 motion-reduce:animate-none">
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
        <span className="truncate">
          {lookup.stop.name} · {t('lines.count', { n: count })}
        </span>
      </p>
    );
  }
  return (
    <p id={id} className="mt-3 animate-fade-in text-sm font-medium text-white/60 motion-reduce:animate-none">
      {lookup.status !== 'invalid'
        ? t('create.stop.hint')
        : suggestionCount > 0
          ? t('create.stop.pick')
          : t('create.stop.unknown')}
    </p>
  );
}

function CreateCardForm({ titleId, onClose, onCreate }) {
  const t = useT();
  // Los pasos se abren por separado: al encontrar la parada, "líneas" se
  // despliega sin plegar el buscador (que tiene el foco mientras se escribe).
  const [openSteps, setOpenSteps] = useState({ stop: false, lines: false, customize: false });
  const [query, setQuery] = useState('');
  const lookup = useStopLookup(query);
  const stop = lookup.status === 'success' ? lookup.stop : null;
  // La lista de paradas suele estar ya cargada (la usa el buscador); al
  // llegar, se recalculan las líneas.
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
  const lines = stop ? selectableLines(stop, lookup.buses) : [];

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
  const [note, setNote] = useState('');
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
          title={t('create.title')}
          subtitle={t('create.subtitle')}
          titleAs="h2"
          titleId={titleId}
          wrap
        />
        <IconButton icon={X} label={t('common.close')} onClick={onClose} className="ml-auto shrink-0" />
      </header>

      <div className="mt-6 flex flex-col gap-4">
        <StepSection
          icon={BusFront}
          title={t('create.stop.title')}
          subtitle={stop ? `${t('stop.fallback', { id: stop.id })} · ${stop.name}` : t('create.stop.subtitle')}
          open={openSteps.stop}
          onToggle={() => toggleStep('stop')}
        >
          {/* Elegir una parada (sugerencia o cercana) la busca por su número. */}
          <StopPicker
            query={query}
            onQueryChange={setQuery}
            onSelect={(item) => setQuery(String(item.id))}
            excludeId={stop?.id}
            loading={lookup.status === 'loading'}
            describedBy={statusId}
          >
            {(suggestionCount) => (
              <div aria-live="polite">
                {/* `key` por tipo de mensaje: al cambiar, el nuevo entra con un fundido. */}
                <StopStatus
                  key={`${statusKind(lookup)}-${lookup.status === 'invalid' && suggestionCount > 0}`}
                  id={statusId}
                  lines={lines}
                  lookup={lookup}
                  query={query}
                  suggestionCount={suggestionCount}
                />
              </div>
            )}
          </StopPicker>
        </StepSection>

        <StepSection
          icon={Route}
          title={t('create.lines.title')}
          subtitle={
            selectedLines.length
              ? t('create.lines.chosen', { n: selectedLines.length })
              : t('create.lines.subtitle')
          }
          open={openSteps.lines}
          onToggle={() => toggleStep('lines')}
        >
          {stop ? (
            <div key="lines" className="animate-fade-in motion-reduce:animate-none">
              <LineChips lines={lines} selected={selectedLines} onToggle={toggleLine} />
              <p className="mt-3 text-sm font-medium text-white/60">
                {t('create.lines.hint')}
              </p>
            </div>
          ) : (
            <p key="empty" className="animate-fade-in text-base font-medium text-white/70 motion-reduce:animate-none">
              {t('create.lines.empty')}
            </p>
          )}
        </StepSection>

        <StepSection
          icon={SlidersHorizontal}
          title={t('create.customize.title')}
          subtitle={`${cardName ? `${cardName} · ` : ''}${t('create.customize.visible', { n: busesToShow })}`}
          open={openSteps.customize}
          onToggle={() => toggleStep('customize')}
        >
          <CardNameField
            label={t('create.name')}
            value={name}
            onChange={setName}
            placeholder={stop ? stop.name : t('create.name.placeholder')}
            describedBy={nameHintId}
          />
          <p id={nameHintId} className="mt-2 text-sm font-medium text-white/60">
            {t('create.name.hint')}
          </p>
          <div className="mt-4">
            <CardNameField
              label={t('edit.note')}
              value={note}
              onChange={setNote}
              placeholder={t('edit.note.placeholder')}
              maxLength={NOTE_MAX}
            />
          </div>

          <p className="mb-2 mt-4 text-sm font-semibold text-white/80" aria-hidden="true">
            {t('create.visible')}
          </p>
          <SegmentedControl
            label={t('create.visible.label')}
            options={BUSES_OPTIONS.map((value) => ({ value, label: t('create.visible.option', { n: value }) }))}
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
            onCreate(toRouteCard({ stop, buses: lookup.buses, lines: selectedLines, title: name, note, busesToShow, color }))
          }
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          {t('create.submit')}
        </PillButton>
      </div>
    </>
  );
}
