// Genera src/data/routes.json (recorridos de Vitrasa con el orden de sus
// paradas) a partir del GTFS oficial que publica el Concello de Vigo. La app
// lo usa para saber el sentido de la marcha: un trayecto A → B solo es
// directo si algún recorrido pasa por A y, después, por B.
//
//   node scripts/generate-routes.mjs                  # descarga el GTFS
//   node scripts/generate-routes.mjs gtfs_vigo.zip    # o usa un ZIP ya bajado
//   node scripts/generate-routes.mjs --soft           # en el build (prebuild)
//
// Por defecto (GitHub Actions, a mano) cualquier fallo termina con código 1 y
// deja el routes.json que hubiera. Con `--soft` (build de Vercel) el fallo se
// avisa y el build sigue con el fichero anterior; si no hay ninguno, se
// escribe `[]` y la app avisa de que no puede verificar el sentido.
//
// Salida: [{ line, dir, head, stops, m }], un recorrido por cada combinación
// distinta de línea, sentido, letrero y secuencia de paradas:
// - `stops`: números de marquesina (los de la API de tiempos) en orden de paso.
// - `m`: metros acumulados en cada parada (suma de las distancias en línea
//   recta entre paradas consecutivas; sirve para comparar líneas).
//
// Datos: GTFS de Vitrasa, Concello de Vigo (Open Data Commons Attribution).
import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { Unzip, UnzipInflate } from 'fflate';

const SOURCE_URL = 'https://datos.vigo.org/data/transporte/gtfs_vigo.zip';
const OUTPUT = new URL('../src/data/routes.json', import.meta.url);
const NEEDED = ['stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt'];
// El ZIP se pasa al descompresor en trozos: nunca hay un fichero entero
// descomprimido en memoria, solo las filas que ya se han convertido.
const CHUNK_BYTES = 1 << 20;
// Mínimos para dar el GTFS por bueno (Vitrasa tiene ~45 líneas y ~1150 paradas).
const MIN_ROUTES = 20;
const MIN_STOPS = 300;

const args = process.argv.slice(2);
const soft = args.includes('--soft');
const inputFile = args.find((arg) => !arg.startsWith('--'));
// En el build no se espera tanto: si datos.vigo.org no responde, sigue sin él.
const attempts = soft ? 2 : 3;
const timeoutMs = soft ? 30_000 : 90_000;

const log = (message) => console.log(`[routes] ${message}`);

class GtfsError extends Error {}

// ---------------------------------------------------------------------------
// Descarga

async function download() {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      log(`Descargando ${SOURCE_URL} (intento ${attempt}/${attempts})…`);
      const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new GtfsError(`HTTP ${response.status} ${response.statusText}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      log(`Fallo en la descarga: ${error.message}`);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
    }
  }
  throw new GtfsError(`No se pudo descargar el GTFS: ${lastError?.message}`);
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180: comillas, comas y comillas dobles escapadas dentro de campos)

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * Lector de un fichero CSV que llega en trozos: convierte cada fila en un
 * objeto con las columnas de la cabecera y se la pasa a `onRow`.
 */
function csvReader(onRow) {
  const decoder = new TextDecoder('utf-8');
  let header = null;
  let pending = '';
  let rows = 0;
  const handleLine = (rawLine) => {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line.trim()) return;
    const fields = parseCsvLine(line);
    if (!header) {
      header = fields.map((name) => name.replace(/^﻿/, '').trim());
      return;
    }
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = (fields[i] ?? '').trim();
    rows++;
    onRow(row);
  };
  return {
    push(chunk, final) {
      const text = pending + decoder.decode(chunk, { stream: !final });
      const lines = text.split('\n');
      pending = final ? '' : lines.pop();
      for (const line of lines) handleLine(line);
    },
    get rows() {
      return rows;
    },
  };
}

// ---------------------------------------------------------------------------
// Integridad del ZIP: el descompresor en streaming no comprueba el CRC, así que
// se lee el directorio central (al final del ZIP) y cada fichero se verifica
// con su CRC-32 y su tamaño al terminar de descomprimirlo.

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(crc, bytes) {
  let c = ~crc;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** Entradas del directorio central: nombre → { crc, size }. */
function readCentralDirectory(zip) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // Registro final (EOCD): 22 bytes + comentario de hasta 64 KB.
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new GtfsError('ZIP truncado: no tiene directorio central');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (offset + 46 > zip.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new GtfsError('ZIP corrupto: directorio central dañado');
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = decoder.decode(zip.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name.split('/').pop(), { crc: view.getUint32(offset + 16, true), size: view.getUint32(offset + 24, true) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Lectura del GTFS

/** Descomprime en streaming los ficheros necesarios y los procesa fila a fila. */
function readGtfs(zip) {
  if (zip.length < 4 || zip[0] !== 0x50 || zip[1] !== 0x4b) {
    throw new GtfsError('El fichero descargado no es un ZIP (¿página de error?)');
  }
  const directory = readCentralDirectory(zip);

  // Paradas: stop_id → número de marquesina y coordenadas.
  const stops = new Map();
  // Líneas: route_id → código ("C3d").
  const lines = new Map();
  // Viajes: trip_id → { route, dir, head }.
  const trips = new Map();
  // Paradas de cada viaje en pares planos [secuencia, parada, secuencia, …].
  // Los ids de viaje y de parada se convierten a enteros: ocupa una fracción
  // de lo que ocuparían cientos de miles de objetos con textos.
  const tripIds = new Map();
  const stopIds = new Map();
  const tripStops = [];
  const intern = (map, value) => {
    let id = map.get(value);
    if (id === undefined) {
      id = map.size;
      map.set(value, id);
    }
    return id;
  };

  const handlers = {
    'stops.txt': (row) => {
      // `stop_code` es el número de la marquesina (a veces con prefijo, "P6860").
      const code = Number.parseInt(String(row.stop_code ?? '').replace(/^\D+/, ''), 10);
      const fallback = Number.parseInt(String(row.stop_id ?? '').replace(/^\D+/, ''), 10);
      const id = Number.isInteger(code) && code > 0 ? code : fallback;
      const lat = Number(row.stop_lat);
      const lon = Number(row.stop_lon);
      if (row.stop_id && Number.isInteger(id) && id > 0) stops.set(row.stop_id, { id, lat, lon });
    },
    'routes.txt': (row) => {
      // "15B." / "4A-": variantes de la misma línea para el público.
      const code = String(row.route_short_name || row.route_id || '').trim().replace(/[.-]+$/, '');
      if (row.route_id && code) lines.set(row.route_id, code);
    },
    'trips.txt': (row) => {
      if (!row.trip_id || !row.route_id) return;
      trips.set(row.trip_id, {
        route: row.route_id,
        dir: Number.parseInt(row.direction_id, 10) || 0,
        head: String(row.trip_headsign ?? '').replace(/\s+/g, ' ').trim(),
      });
    },
    'stop_times.txt': (row) => {
      const sequence = Number.parseInt(row.stop_sequence, 10);
      if (!row.trip_id || !row.stop_id || !Number.isFinite(sequence)) return;
      const trip = intern(tripIds, row.trip_id);
      (tripStops[trip] ??= []).push(sequence, intern(stopIds, row.stop_id));
    },
  };

  const found = new Map();
  let failure = null;
  const unzip = new Unzip((file) => {
    const name = file.name.split('/').pop();
    const handler = handlers[name];
    if (!handler) return;
    const reader = csvReader(handler);
    const entry = { reader, done: false, crc: 0, size: 0 };
    found.set(name, entry);
    file.ondata = (error, chunk, final) => {
      if (error) {
        failure ??= new GtfsError(`ZIP corrupto en ${name}: ${error.message}`);
        return;
      }
      entry.crc = crc32(entry.crc, chunk);
      entry.size += chunk.length;
      try {
        reader.push(chunk, final);
      } catch (parseError) {
        failure ??= new GtfsError(`No se pudo leer ${name}: ${parseError.message}`);
      }
      if (!final) return;
      entry.done = true;
      const expected = directory.get(name);
      // 0xFFFFFFFF: tamaño en ZIP64 (no aplica a un GTFS de este tamaño).
      if (!expected || expected.crc !== entry.crc || (expected.size !== 0xffffffff && expected.size !== entry.size)) {
        failure ??= new GtfsError(`ZIP corrupto: ${name} no coincide con su CRC-32`);
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);

  try {
    for (let offset = 0; offset < zip.length; offset += CHUNK_BYTES) {
      unzip.push(zip.subarray(offset, offset + CHUNK_BYTES), offset + CHUNK_BYTES >= zip.length);
      if (failure) throw failure;
    }
  } catch (error) {
    if (error instanceof GtfsError) throw error;
    throw new GtfsError(`ZIP corrupto: ${error.message}`);
  }

  for (const name of NEEDED) {
    const entry = found.get(name);
    if (!entry) throw new GtfsError(`Falta ${name} en el GTFS`);
    if (!entry.done) throw new GtfsError(`${name} está incompleto (ZIP truncado)`);
    if (!entry.reader.rows) throw new GtfsError(`${name} está vacío`);
    log(`${name}: ${entry.reader.rows} filas`);
  }

  return { stops, lines, trips, tripIds, stopIds, tripStops };
}

// ---------------------------------------------------------------------------
// Recorridos

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
function haversineMeters(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildRoutes({ stops, lines, trips, tripIds, stopIds, tripStops }) {
  const stopById = [];
  for (const [stopId, index] of stopIds) stopById[index] = stops.get(stopId);

  // Un recorrido por línea + sentido + letrero + secuencia; `trips` cuenta los
  // viajes que lo hacen (para ordenar los más habituales primero).
  const patterns = new Map();
  let skipped = 0;
  for (const [tripId, index] of tripIds) {
    const trip = trips.get(tripId);
    const line = trip && lines.get(trip.route);
    const pairs = tripStops[index];
    if (!line || !pairs) {
      skipped++;
      continue;
    }
    const order = [];
    for (let i = 0; i < pairs.length; i += 2) order.push([pairs[i], pairs[i + 1]]);
    order.sort((a, b) => a[0] - b[0]);
    const sequence = [];
    for (const [, stopIndex] of order) {
      const stop = stopById[stopIndex];
      // Paradas sin número de marquesina o repetidas seguidas: fuera.
      if (stop && sequence.at(-1) !== stop) sequence.push(stop);
    }
    if (sequence.length < 2) {
      skipped++;
      continue;
    }
    const key = `${line}|${trip.dir}|${trip.head}|${sequence.map((stop) => stop.id).join(',')}`;
    const pattern = patterns.get(key);
    if (pattern) pattern.trips++;
    else patterns.set(key, { line, dir: trip.dir, head: trip.head, sequence, trips: 1 });
  }
  if (skipped) log(`${skipped} viajes sin línea o sin paradas válidas, descartados`);

  const collator = new Intl.Collator('es', { numeric: true });
  return [...patterns.values()]
    .sort((a, b) => collator.compare(a.line, b.line) || a.dir - b.dir || b.trips - a.trips)
    .map(({ line, dir, head, sequence }) => {
      let metres = 0;
      const m = sequence.map((stop, i) => {
        const previous = sequence[i - 1];
        if (previous && [stop, previous].every((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))) {
          metres += haversineMeters(previous, stop);
        }
        return Math.round(metres);
      });
      return { line, dir, head, stops: sequence.map((stop) => stop.id), m };
    });
}

function validate(routes) {
  const covered = new Set(routes.flatMap((route) => route.stops));
  if (routes.length < MIN_ROUTES || covered.size < MIN_STOPS) {
    throw new GtfsError(
      `GTFS incompleto: ${routes.length} recorridos y ${covered.size} paradas (mínimo ${MIN_ROUTES} y ${MIN_STOPS})`,
    );
  }
  log(`${routes.length} recorridos de ${new Set(routes.map((route) => route.line)).size} líneas, ${covered.size} paradas`);
}

// ---------------------------------------------------------------------------
// Escritura

// Se escribe en un temporal y se renombra: nunca queda un routes.json a medias.
async function writeAtomic(text) {
  const temporary = new URL(`${OUTPUT.href}.tmp`);
  await writeFile(temporary, text);
  await rename(temporary, OUTPUT);
}

const serialize = (routes) => `[\n${routes.map((route) => `  ${JSON.stringify(route)}`).join(',\n')}\n]\n`;

try {
  const zip = inputFile ? new Uint8Array(await readFile(inputFile)) : await download();
  log(`ZIP de ${(zip.length / 1024 / 1024).toFixed(1)} MB`);
  const routes = buildRoutes(readGtfs(zip));
  validate(routes);
  await writeAtomic(serialize(routes));
  log('→ src/data/routes.json');
} catch (error) {
  const message = error instanceof GtfsError ? error.message : `Error inesperado: ${error.stack ?? error}`;
  if (!soft) {
    console.error(`[routes] ${message}`);
    console.error('[routes] routes.json no se ha modificado.');
    process.exit(1);
  }
  console.warn(`[routes] AVISO: ${message}`);
  if (existsSync(OUTPUT)) {
    console.warn('[routes] Se mantiene el routes.json anterior; el build continúa.');
  } else {
    await writeAtomic('[]\n');
    console.warn('[routes] Sin datos de recorridos: la app avisará de que no puede verificar el sentido.');
  }
}
