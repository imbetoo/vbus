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
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${km.toLocaleString('es-ES', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
