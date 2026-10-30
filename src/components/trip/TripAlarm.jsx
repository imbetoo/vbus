import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TRIP_NOTIFICATION_TAG } from '../../hooks/useTrip';
import { closeNotification, notificationStatus, requestNotificationPermission, unlockSound } from '../../lib/alerts';
import { keepScreenOn, releaseScreen } from '../../lib/wakeLock';
import { PRESSABLE } from '../ui/pressable';
import TripSheet from './TripSheet';

/**
 * "Avisarme" de una ruta directa: abre el modo viaje (`TripSheet`), que te
 * avisa unos 3 min antes de llegar a la parada de bajada.
 *
 * Todo lo que Safari solo permite dentro de un toque se pide aquí, en el
 * mismo clic: mantener la pantalla encendida, desbloquear el sonido y el
 * permiso de notificaciones (sin esperarlo: el modo viaje se abre ya y el
 * permiso se refleja cuando el usuario conteste).
 *
 * `trip`: `{ boarding, destination, options, lines }`; `buses` y `updatedAt`:
 * llegadas a la parada de subida (las de la consulta rápida).
 */
export default function TripAlarm({ trip, buses, updatedAt }) {
  // Copia del trayecto al empezar: si la consulta cambia debajo, el viaje no.
  const [active, setActive] = useState(null);
  const [notifications, setNotifications] = useState(notificationStatus);

  const start = () => {
    keepScreenOn();
    unlockSound();
    setNotifications(notificationStatus());
    requestNotificationPermission().then(setNotifications);
    setActive(trip);
  };

  const end = useCallback(() => {
    releaseScreen();
    closeNotification(TRIP_NOTIFICATION_TAG);
    setActive(null);
  }, []);

  // Si los resultados cambian y el botón desaparece, la pantalla vuelve a
  // poder bloquearse.
  useEffect(() => releaseScreen, []);

  return (
    <>
      <button
        type="button"
        onClick={start}
        aria-haspopup="dialog"
        className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
      >
        <Bell className="h-5 w-5 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
        Avisarme
      </button>
      <TripSheet
        trip={active}
        buses={buses}
        updatedAt={updatedAt}
        notifications={notifications}
        onEnd={end}
      />
    </>
  );
}
