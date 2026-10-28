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

// Mismo SVG con la forma y el reborde de cristal cuadrados (rx 0): para los
// iconos a sangre.
let fullBleed = source;
for (const id of ['shape-rect', 'rim']) {
  const squared = fullBleed.replace(new RegExp(`(<rect id="${id}"[^>]*?)rx="[\\d.]+"`), '$1rx="0"');
  if (squared === fullBleed) throw new Error(`No se encontró <rect id="${id}" rx="…"> en public/icon.svg`);
  fullBleed = squared;
}

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
    // A todo color: con paleta de 256 colores los degradados oscuros del
    // cristal se manchan (pesaría ~4 veces menos, pero se nota).
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(new URL(file, PUBLIC_DIR).pathname);
  console.log(`public/${file} (${size}×${size})`);
}
