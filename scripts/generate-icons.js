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
// - shortcut-*.png (192 px): iconos de los accesos directos del manifest
//   (mantener pulsado el icono en Android): el glifo de lucide en blanco sobre
//   el mismo azul profundo del icono, a sangre y dentro de la zona segura
//   (el lanzador los recorta con su forma).
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

// Accesos directos: mismos trazos que los botones de la app (lucide).
const LUCIDE = new URL('../node_modules/lucide-react/dist/esm/icons/', import.meta.url);
const SHORTCUTS = [
  { file: 'shortcut-scan.png', icon: 'scan-qr-code' },
  { file: 'shortcut-search.png', icon: 'search' },
  { file: 'shortcut-new.png', icon: 'plus' },
];
const toSvgNode = ([tag, attrs]) =>
  `<${tag} ${Object.entries(attrs)
    .filter(([name]) => name !== 'key')
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ')}/>`;

for (const { file, icon } of SHORTCUTS) {
  const { __iconData } = await import(new URL(`${icon}.mjs`, LUCIDE).href);
  const glyph = __iconData.node.map(toSvgNode).join('');
  // Glifo de 24 → 96 px centrado en 192 (50 %: dentro de la zona segura).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1F5BD8"/><stop offset="1" stop-color="#0B1E4A"/>
  </linearGradient></defs>
  <rect width="192" height="192" fill="url(#bg)"/>
  <g transform="translate(48 48) scale(4)" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
</svg>`;
  await sharp(Buffer.from(svg), { density: 144 })
    .resize(192, 192)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(new URL(file, PUBLIC_DIR).pathname);
  console.log(`public/${file} (192×192)`);
}
