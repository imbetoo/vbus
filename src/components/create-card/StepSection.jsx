import { useId } from 'react';
import IconHeading from '../ui/IconHeading';

/** Paso desplegable del formulario: fila pulsable + panel con sus campos. */
export default function StepSection({ icon, title, subtitle, open, onToggle, children }) {
  const panelId = useId();

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full rounded-3xl p-4 text-left transition duration-300 ease-spring active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <IconHeading icon={icon} title={title} subtitle={subtitle} wrap />
      </button>

      <div id={panelId} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </section>
  );
}
