const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Distancia en metros entre dos puntos `{ lat, lon }` sobre la superficie
 * terrestre (fórmula de Haversine). Para distancias de una ciudad el error es
 * de centímetros: no hace falta nada más preciso.
 */
export function haversineMeters(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "85 m", "450 m", "1,2 km", "12 km". */
export function formatDistance(meters) {
  // Se redondea antes de elegir la unidad: 997 m es "1 km", no "1000 m".
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) return `${Math.max(10, rounded)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString('es-ES', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

// Si la parada más cercana está más lejos que esto, se está fuera de Vigo.
export const OUTSIDE_VIGO_M = 15_000;

/**
 * Posición actual del GPS (`{ lat, lon }`), con alta precisión y 15 s de
 * margen. Rechaza con el `GeolocationPositionError` del navegador (permiso
 * denegado, sin señal o tiempo agotado). La ubicación no se guarda.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}

/** Estado de un error de geolocalización: `denied` (permiso) o `unavailable` (sin señal o tiempo agotado). */
export function locationErrorStatus(error) {
  // `GeolocationPositionError.PERMISSION_DENIED` = 1.
  return error?.code === 1 ? 'denied' : 'unavailable';
}
