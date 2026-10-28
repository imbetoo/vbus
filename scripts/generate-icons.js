// Genera los PNG de la PWA a partir del icono maestro vectorial public/icon.svg.
//
//   npm run icons        (o: node scripts/generate-icons.js)
//
// - pwa-192x192.png y pwa-512x512.png: con las esquinas redondeadas del SVG
//   (iconos "any" de Android/escritorio).
// - maskable-icon-512x512.png y apple-touch-icon.png (180 px): a sangre, sin
//   esquinas ni transparencia, porque Android e iOS recortan el icono con su
//   propia forma (en iOS lo transparente saldría negro). El autobús ya cae en
//   la zona segura del 80 % que pide el formato maskable.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const PUBLIC_DIR = new URL('../public/', import.meta.url);
const source = await readFile(new URL('icon.svg', PUBLIC_DIR), 'utf8');

// Mismo SVG con la forma base cuadrada (rx 0): para los iconos a sangre.
const fullBleed = source.replace(/(<rect id="shape-rect"[^>]*?)rx="[\d.]+"/, '$1rx="0"');
if (fullBleed === source) throw new Error('No se encontró <rect id="shape-rect" rx="…"> en public/icon.svg');

const ICONS = [
  { file: 'pwa-192x192.png', size: 192, svg: source },
  { file: 'pwa-512x512.png', size: 512, svg: source },
  { file: 'maskable-icon-512x512.png', size: 512, svg: fullBleed },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
];

for (const { file, size, svg } of ICONS) {
  // Densidad suficiente para rasterizar el SVG (512 de lado) a más resolución
  // y reducir después: bordes y degradados limpios.
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(size, size)
    // Paleta de 256 colores con tramado: unas 4 veces menos peso sin bandas
    // visibles en los degradados (el service worker los descarga todos).
    .png({ compressionLevel: 9, palette: true, quality: 100, dither: 1 })
    .toFile(new URL(file, PUBLIC_DIR).pathname);
  console.log(`public/${file} (${size}×${size})`);
}
