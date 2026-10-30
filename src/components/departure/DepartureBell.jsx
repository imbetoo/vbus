import { Bell } from 'lucide-react';
import { haptics } from '../../lib/haptics';
import IconButton from '../ui/IconButton';

/**
 * Campana de un autobús (al final de su fila): "avísame cuando le falten X
 * min" (modo salida). La usan la consulta rápida y las tarjetas de Mis rutas.
 */
export default function DepartureBell({ bus, onClick }) {
  return (
    <IconButton
      icon={Bell}
      size="sm"
      label={`Avisarme para salir: ${bus.line}, ${bus.time < 1 ? 'llegando' : `${bus.time} min`}`}
      aria-haspopup="dialog"
      onClick={(event) => {
        haptics.impact();
        onClick(event);
      }}
    />
  );
}
