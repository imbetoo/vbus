import { useId } from 'react';
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
        <IconHeading icon={icon} title={title} subtitle={subtitle} wrap />
      </button>

      {/* Acordeón: `grid-template-rows` 0fr → 1fr anima la altura real del
          contenido sin medirla en JS, con la curva suave de las hojas de iOS.
          El contenido aparece cuando ya hay sitio (opacidad con retardo) y se
          desvanece rápido antes de plegarse. Plegado queda `inert` (sin foco). */}
      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-[450ms] ease-smooth motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {/* `pt-1` deja sitio al anillo de foco del buscador. */}
          <div
            className={`px-4 pb-4 pt-1 transition-opacity ease-out motion-reduce:transition-none ${
              open ? 'opacity-100 delay-100 duration-300' : 'opacity-0 duration-150'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
