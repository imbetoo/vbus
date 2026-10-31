import { Bell } from 'lucide-react';
import { startFocus } from '../../lib/focusSession';
import { haptics } from '../../lib/haptics';
import { PRESSABLE } from '../ui/pressable';
import { useT } from '../../i18n';

/**
 * "Avisarme" de una ruta directa: empieza el modo viaje (`TripSession`, que
 * pinta `FocusHost`), que te avisa unos 3 min antes de llegar a la parada de
 * bajada y sigue aunque se cierre la consulta rápida.
 *
 * Todo lo que Safari solo permite dentro de un toque se pide aquí, en el
 * mismo clic (`startFocus`): mantener la pantalla encendida, desbloquear el
 * sonido y el permiso de notificaciones (sin esperarlo: el modo viaje se abre
 * ya y el permiso se refleja cuando el usuario conteste).
 *
 * `trip`: `{ boarding, destination, options, lines, plan }`; `buses` y
 * `updatedAt`: llegadas a la parada de subida (las de la consulta rápida), con
 * las que empieza (luego las pide el propio modo viaje).
 */
export default function TripAlarm({ trip, buses, updatedAt }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => {
        haptics.impact();
        // Copia del trayecto al empezar: si la consulta cambia debajo, el viaje no.
        startFocus('trip', { ...trip, seed: { buses, updatedAt } });
      }}
      aria-haspopup="dialog"
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
    >
      <Bell className="h-5 w-5 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
      {t('trip.alertMe')}
    </button>
  );
}
