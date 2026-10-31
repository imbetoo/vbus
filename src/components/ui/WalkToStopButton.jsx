import { Footprints } from 'lucide-react';
import { findStop } from '../../data/stops';
import { walkingDirectionsUrl } from '../../lib/walking';
import { PRESSABLE } from './pressable';
import { useT } from '../../i18n';

/**
 * Botón sutil de "cómo llegar andando" a una parada (icono de pisadas, círculo
 * de 32 px como el resto de acciones de tarjeta, área táctil de 48 px). Es un
 * enlace a la app de mapas del sistema (`walkingDirectionsUrl`) en una pestaña
 * nueva: el sistema la abre en la app nativa.
 *
 * Si la parada llega sin coordenadas (p. ej. una tarjeta guardada, que solo
 * tiene el número), se completan con `stopsList` al tocar: la lista se
 * precarga al arrancar la app, así casi siempre ya están.
 */
export default function WalkToStopButton({ stop }) {
  const t = useT();
  const url = () => walkingDirectionsUrl(withCoordinates(stop));

  return (
    <a
      href={url()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('walk.label', { stop: stop.name ?? t('stop.fallback', { id: stop.id }) })}
      // Al tocar, con las coordenadas más recientes (la lista pudo cargar después).
      onClick={(event) => {
        event.currentTarget.href = url();
      }}
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white after:absolute after:-inset-2 after:rounded-full after:content-[''] active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${PRESSABLE}`}
    >
      <Footprints className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
    </a>
  );
}

// La parada con coordenadas: las suyas o, si no las trae, las de la lista.
function withCoordinates(stop) {
  if (Number.isFinite(stop.lat) && Number.isFinite(stop.lon)) return stop;
  const known = findStop(stop.id);
  return Number.isFinite(known.lat) && Number.isFinite(known.lon) ? { ...stop, lat: known.lat, lon: known.lon } : stop;
}
