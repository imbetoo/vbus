import { useId } from 'react';
import Collapse from '../ui/Collapse';
import IconHeading from '../ui/IconHeading';
import { PRESSABLE } from '../ui/pressable';

/** Paso desplegable del formulario: fila pulsable + panel con sus campos. */
export default function StepSection({ icon, title, subtitle, open, onToggle, children }) {
  const panelId = useId();

  return (
    // `origin-top`: el rebote al pulsar escala desde arriba, así no se
    // desplaza mientras la altura cambia.
    <section
      className={`origin-top rounded-3xl border border-white/10 bg-white/[0.06] shadow-lg shadow-black/10 ${PRESSABLE}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full rounded-3xl p-4 text-left transition-colors duration-[400ms] ease-spring active:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {/* Subtítulo en una línea: cambia al elegir parada/líneas o al escribir el
            nombre, y si cambiara de alto movería el contenido del paso. */}
        <IconHeading icon={icon} title={title} subtitle={subtitle} wrap="title" />
      </button>

      {/* `pt-1` deja sitio al anillo de foco del buscador. */}
      <Collapse id={panelId} open={open} className="px-4 pb-4 pt-1">
        {children}
      </Collapse>
    </section>
  );
}
