import { Plus } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import IconHeading from '../ui/IconHeading';
import { useT } from '../../i18n';

/** Tarjeta-botón del Dashboard que abre la hoja "Nueva tarjeta". */
export default function CreateCardButton({ onClick }) {
  const t = useT();
  return (
    <GlassCard
      as="button"
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <IconHeading
        icon={Plus}
        iconStrokeWidth={2.75}
        title={t('createButton.title')}
        subtitle={t('createButton.subtitle')}
      />
    </GlassCard>
  );
}
