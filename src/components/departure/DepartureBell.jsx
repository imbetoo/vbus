import { Bell } from 'lucide-react';
import { haptics } from '../../lib/haptics';
import IconButton from '../ui/IconButton';
import { useT } from '../../i18n';

/**
 * Campana de un autobús (al final de su fila): "avísame cuando le falten X
 * min" (modo salida). La usan la consulta rápida y las tarjetas de Mis rutas.
 */
export default function DepartureBell({ bus, onClick }) {
  const t = useT();
  return (
    <IconButton
      icon={Bell}
      size="sm"
      label={t('departure.bell', { line: bus.line, time: bus.time < 1 ? t('departure.busArriving') : t('time.minutes', { n: bus.time }) })}
      aria-haspopup="dialog"
      onClick={(event) => {
        haptics.impact();
        onClick(event);
      }}
    />
  );
}
