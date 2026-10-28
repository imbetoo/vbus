// Regenera src/data/stopsList.json con todas las paradas de Vitrasa a partir
// de los datos abiertos del Concello de Vigo.
//
//   node scripts/update-stops.mjs                 # descarga de datos.vigo.org
//   node scripts/update-stops.mjs paradas.json    # o desde un fichero ya bajado
//
// Origen: https://datos.vigo.org/data/transporte/paradas.json
// [{ id, stop_id, nombre, lat, lon, lineas }]. `id` es el número de la
// marquesina (el que usa la API de tiempos); `stop_id` es un código interno.
import { readFile, writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://datos.vigo.org/data/transporte/paradas.json';
const OUTPUT = new URL('../src/data/stopsList.json', import.meta.url);

const file = process.argv[2];
const raw = file ? JSON.parse(await readFile(file, 'utf8')) : await (await fetch(SOURCE_URL)).json();

// "Rúa do Conde de Torrecedeira  81" → "Rúa do Conde de Torrecedeira, 81" (como infobus).
const cleanName = (name) =>
  String(name)
    .trim()
    .replace(/\s{2,}(?=\d)/g, ', ')
    .replace(/\s+/g, ' ');
const round = (value) => Math.round(Number(value) * 1e6) / 1e6;

const stops = raw
  .filter((stop) => Number.isInteger(Number(stop.id)) && String(stop.nombre ?? '').trim())
  .map((stop) => ({
    id: Number(stop.id),
    name: cleanName(stop.nombre),
    lat: round(stop.lat),
    lon: round(stop.lon),
    lines: String(stop.lineas ?? '')
      .split(',')
      .map((line) => line.trim())
      .filter(Boolean),
  }))
  .sort((a, b) => a.id - b.id);

// Una parada por línea: el fichero ocupa poco y los cambios se leen bien en git.
await writeFile(OUTPUT, `[\n${stops.map((stop) => `  ${JSON.stringify(stop)}`).join(',\n')}\n]\n`);
console.log(`${stops.length} paradas → src/data/stopsList.json`);
