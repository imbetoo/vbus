import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { useNow } from '../../hooks/useNow';
import { MAX_LEAD_MINUTES, QUICK_LEADS, defaultLead, leadProblem, parseLead } from '../../lib/departure';
import { haptics } from '../../lib/haptics';
import { etaNow, minutesText } from '../../lib/tripTracker';
import { lineColor } from '../../services/vigobusAdapter';
import LineBadge from '../bus/LineBadge';
import IconButton from '../ui/IconButton';
import Modal from '../ui/Modal';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';
import { t, useT } from '../../i18n';

function problemText(problem, eta) {
  switch (problem) {
    case 'empty':
      return t('departure.problem.empty');
    case 'range':
      return t('departure.problem.range', { max: MAX_LEAD_MINUTES });
    case 'arriving':
      return t('departure.problem.arriving');
    case 'too-late':
      return t('departure.problem.tooLate', { time: minutesText(eta) });
    default:
      return null;
  }
}

/**
 * "¿Con cuántos minutos de antelación quieres que te avisemos?" para un
 * autobús de la lista (`request` = `{ bus, fetchedAt }`): atajos de 2, 3 y
 * 5 min y un campo numérico para el número exacto (solo minutos enteros).
 * Si el autobús ya está más cerca que eso, lo dice y no deja confirmar.
 * `onConfirm(lead)` se llama dentro del toque (el modo salida lo necesita).
 */
export default function LeadTimeModal({ request, onClose, onConfirm }) {
  const titleId = useId();
  // El último autobús sigue pintado mientras la ventana sale.
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);

  return (
    <Modal open={Boolean(request)} onClose={onClose} labelledBy={titleId} className="w-[min(92vw,24rem)]">
      {shown && <LeadTimeForm key={shown.bus.id} request={shown} titleId={titleId} onClose={onClose} onConfirm={onConfirm} />}
    </Modal>
  );
}

function LeadTimeForm({ request, titleId, onClose, onConfirm }) {
  const t = useT();
  const { bus, fetchedAt } = request;
  const inputId = useId();
  const errorId = useId();
  const now = useNow(5_000);
  const eta = Math.max(0, etaNow(bus, fetchedAt, now));
  const [text, setText] = useState(() => String(defaultLead(etaNow(bus, fetchedAt, Date.now()))));
  const lead = parseLead(text);
  const problem = leadProblem(lead, eta);
  const message = problemText(problem, eta);

  const confirm = (event) => {
    event.preventDefault();
    // Se vuelve a comprobar en el momento del toque (la cuenta atrás sigue).
    if (leadProblem(lead, etaNow(bus, fetchedAt, Date.now()))) return;
    haptics.impact();
    onConfirm(lead);
  };

  return (
    <form className="flex flex-col gap-4 p-5" onSubmit={confirm} noValidate>
      <header className="flex items-start gap-3">
        <LineBadge line={bus.line} color={lineColor(bus.line)} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-2xl/tight font-bold tracking-[-0.015em]">
            {t('departure.title')}
          </h2>
          <p className="mt-0.5 truncate text-base font-medium tabular-nums text-white/60">
            {`${bus.destination} · ${eta < 0.5 ? t('departure.busArriving') : t('departure.busArrives', { time: minutesText(eta) })}`}
          </p>
        </div>
        <IconButton icon={X} label={t('common.close')} onClick={onClose} />
      </header>

      <label htmlFor={inputId} className="text-lg/snug font-medium text-white/90">
        {t('departure.question')}
      </label>

      <div className="flex gap-2" role="group" aria-label={t('departure.shortcuts')}>
        {QUICK_LEADS.map((minutes) => {
          const selected = lead === minutes;
          return (
            <button
              key={minutes}
              type="button"
              aria-pressed={selected}
              onClick={() => setText(String(minutes))}
              className={`h-12 flex-1 rounded-2xl border text-lg font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE} ${
                selected ? 'border-white bg-white text-black' : 'border-white/15 bg-white/10 text-white active:bg-white/15'
              }`}
            >
              {t('time.minutes', { n: minutes })}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={2}
          value={text}
          onChange={(event) => setText(event.target.value.replace(/\D/g, '').slice(0, 2))}
          aria-invalid={Boolean(problem)}
          aria-describedby={message ? errorId : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums text-white outline-none placeholder:text-white/40"
          placeholder="5"
        />
        <span className="text-lg font-medium text-white/60" aria-hidden="true">
          {t('departure.minBefore')}
        </span>
      </div>

      {message && (
        <p
          id={errorId}
          key={problem}
          role="alert"
          className="-mt-1 animate-fade-in px-1 text-base font-medium text-amber-300 motion-reduce:animate-none"
        >
          {message}
        </p>
      )}

      <PillButton type="submit" disabled={Boolean(problem)}>
        {t('departure.submit')}
      </PillButton>
    </form>
  );
}
