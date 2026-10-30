/**
 * Cómo llegar andando a una parada, en la app de mapas del sistema.
 *
 * - En iPhone, iPad y Mac: Apple Maps (`maps.apple.com/?daddr=…&dirflg=w`).
 *   Siempre está instalada y el enlace universal la abre directamente,
 *   también desde la app instalada en la pantalla de inicio (Google Maps en
 *   iOS solo se abre si está instalada; si no, acabaría en el navegador).
 * - En el resto (Android, escritorio): Google Maps
 *   (`google.com/maps/dir/?api=1&destination=…&travelmode=walking`), que
 *   Android abre en su app.
 *
 * Sin origen: la app de mapas parte de la ubicación actual, con su propio
 * GPS (más fresco que el nuestro). Destino: las coordenadas exactas de la
 * parada (`stopsList.json`); si no se conocen, su nombre en Vigo.
 */

export const IS_APPLE = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

function destinationOf(stop) {
  if (Number.isFinite(stop?.lat) && Number.isFinite(stop?.lon)) return `${stop.lat},${stop.lon}`;
  return `${stop?.name ?? `Parada ${stop?.id}`}, Vigo`;
}

/** Enlace universal con la ruta a pie hasta `stop` (`{ id, name, lat?, lon? }`). */
export function walkingDirectionsUrl(stop, { apple = IS_APPLE } = {}) {
  const destination = encodeURIComponent(destinationOf(stop));
  if (apple) return `https://maps.apple.com/?daddr=${destination}&dirflg=w`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}
