import { DEPARTURE_NOTIFICATION_TAG } from '../../hooks/useDeparture';
import { useFocusSession } from '../../hooks/useFocusSession';
import DepartureSheet from './DepartureSheet';
import LeadTimeModal from './LeadTimeModal';

/**
 * Alarma de salida de una parada: la campana de un autobús (`request` =
 * `{ bus, fetchedAt }`) abre `LeadTimeModal`; al confirmar, el modo salida
 * (`DepartureSheet`) con la pantalla encendida, el sonido desbloqueado y el
 * permiso de notificaciones pedido en ese mismo toque (`useFocusSession`,
 * igual que el modo viaje).
 */
export default function DepartureAlarm({ stop, request, onClose }) {
  const session = useFocusSession(DEPARTURE_NOTIFICATION_TAG);

  return (
    <>
      <LeadTimeModal
        request={request}
        onClose={onClose}
        onConfirm={(lead) => {
          session.start({ stop, bus: request.bus, fetchedAt: request.fetchedAt, lead });
          onClose();
        }}
      />
      <DepartureSheet departure={session.active} notifications={session.notifications} onEnd={session.end} />
    </>
  );
}
