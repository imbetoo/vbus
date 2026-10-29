/**
 * Rutas directas de la consulta rápida (origen → destino), calculadas en el
 * cliente y sin latencia: no hay motor de rutas ni mapas, solo se cruzan las
 * líneas que pasan por cada parada según los datos abiertos
 * (`stopsList.json`). Las rutas con transbordo se delegan en Google Maps.
 */

/**
 * Clave para comparar líneas escritas de forma distinta en los datos abiertos
 * y en la API de tiempos ("PSA 1" / "PSA1", "C3d" / "C3D").
 */
export const lineKey = (line) => String(line).replace(/\s+/g, '').toUpperCase();

/**
 * Líneas que pasan por el origen y por el destino (sin transbordo), en el
 * orden de las del origen. Equivale a
 * `originLines.filter((line) => destinationLines.includes(line))`, pero con
 * un `Set` y sin distinguir mayúsculas ni espacios.
 */
export function findDirectLines(originLines = [], destinationLines = []) {
  const destination = new Set(destinationLines.map(lineKey));
  const seen = new Set();
  return originLines.filter((line) => {
    const key = lineKey(line);
    if (!destination.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Solo las llegadas de las líneas indicadas (las directas). */
export function filterBusesByLines(buses, lines) {
  const keys = new Set(lines.map(lineKey));
  return buses.filter((bus) => keys.has(lineKey(bus.line)));
}

/** "Línea C1" / "Líneas C1, C3d, 5A". */
export function formatLines(lines) {
  return `${lines.length === 1 ? 'Línea' : 'Líneas'} ${lines.join(', ')}`;
}

// Punto para la URL de Google Maps: coordenadas exactas o, si no se conocen
// (parada que no está en los datos abiertos), su nombre en Vigo.
function mapsPoint(point) {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lon)) return `${point.lat},${point.lon}`;
  return encodeURIComponent(`${point.name}, Vigo`);
}

/**
 * Enlace universal de Google Maps con la ruta en transporte público (con
 * transbordos si hacen falta). En el móvil, el sistema lo abre en la app de
 * Maps si está instalada. Sin `origin`, Maps parte de la ubicación del
 * usuario.
 */
export function mapsDirectionsUrl(origin, destination) {
  const params = ['api=1'];
  if (origin) params.push(`origin=${mapsPoint(origin)}`);
  params.push(`destination=${mapsPoint(destination)}`, 'travelmode=transit');
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}
