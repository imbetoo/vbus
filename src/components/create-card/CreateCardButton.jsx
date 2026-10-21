import { Plus } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import IconHeading from '../ui/IconHeading';

/** Tarjeta-botón del Dashboard que abre la hoja "Nueva tarjeta". */
export default function CreateCardButton({ onClick }) {
  return (
    <GlassCard
      as="button"
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="w-full text-left transition duration-300 ease-spring active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
    >
      <IconHeading
        icon={Plus}
        iconStrokeWidth={2.75}
        title="Crear nueva tarjeta"
        subtitle="Asignar paradas, rutas…"
      />
    </GlassCard>
  );
}
