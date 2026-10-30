/**
 * Comparación de códigos de línea. Los datos abiertos, el GTFS y la API de
 * tiempos no siempre los escriben igual ("PSA 1" / "PSA1", "C3d" / "C3D"):
 * compararlos tal cual dejaría tarjetas vacías sin ningún error.
 */
export const lineKey = (line) => String(line).replace(/\s+/g, '').toUpperCase();

/** Conjunto de claves de unas líneas, para filtrar llegadas en O(1). */
export const lineKeys = (lines = []) => new Set(lines.map(lineKey));

/** Llegadas de las líneas indicadas (`lines` vacío o ausente: todas). */
export function busesOfLines(buses = [], lines) {
  if (!lines?.length) return buses;
  const keys = lineKeys(lines);
  return buses.filter((bus) => keys.has(lineKey(bus.line)));
}
