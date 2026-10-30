import { startFocus } from '../../lib/focusSession';
import LeadTimeModal from './LeadTimeModal';

/**
 * Alarma de salida de una parada: la campana de un autobús (`request` =
 * `{ stop, bus, fetchedAt }`, de la consulta rápida o de una tarjeta de Mis
 * rutas) abre `LeadTimeModal`; al confirmar, el modo salida
 * (`DepartureSession`, que pinta `FocusHost`) con la pantalla encendida, el
 * sonido desbloqueado y el permiso de notificaciones pedido en ese mismo
 * toque (`startFocus`, igual que el modo viaje).
 */
export default function DepartureAlarm({ request, onClose }) {
  return (
    <LeadTimeModal
      request={request}
      onClose={onClose}
      onConfirm={(lead) => {
        startFocus('departure', { ...request, lead });
        onClose();
      }}
    />
  );
}
