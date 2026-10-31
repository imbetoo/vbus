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
// - Variantes del icono (Medianoche y Neón): los mismos PNG con `-<id>` y
//   su SVG `icon-<id>.svg` (ver `VARIANTS`).
// - shortcut-*.png (192 px): iconos de los accesos directos del manifest
//   (mantener pulsado el icono en Android): el glifo de lucide en blanco sobre
//   el mismo azul profundo del icono, a sangre y dentro de la zona segura
//   (el lanzador los recorta con su forma).
import { readFile, writeFile } from 'node:fs/promises';
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

// Variantes del icono que se eligen al instalar (bienvenida y Ajustes,
// `src/lib/appIcon.js`): el mismo dibujo con otros colores. La clásica usa
// los nombres de siempre; las demás llevan `-<id>` y su propio manifest
// (`vite.config.js`). Colores: los del SVG maestro → los de la variante.
const VARIANTS = {
  classic: {},
  // Medianoche: grafito y negro (combina con las paletas Sombra y OLED); el
  // reflejo cian del cristal se queda como único acento.
  dark: {
    '#1F5BD8': '#3A3A3C',
    '#0B1E4A': '#050505',
    '#061233': '#000000',
    '#030A1F': '#000000',
    '#0E2A66': '#1C1C1E',
    '#163C8C': '#2C2C2E',
    '#DCE6F7': '#D1D1D6',
    '#5A6E96': '#6E6E73',
  },
  // Neón: magenta y morado profundo con cristales cian neón (paleta Cyberpunk).
  neon: {
    '#1F5BD8': '#C026D3',
    '#0B1E4A': '#1A0533',
    '#061233': '#12062B',
    '#030A1F': '#0A0216',
    '#0E2A66': '#2A0B4F',
    '#163C8C': '#3B0F6E',
    '#5AC8FA': '#22F5FF',
    '#DCE6F7': '#F3E8FF',
    '#5A6E96': '#7A5A96',
  },
};
const recolor = (svg, colors) =>
  Object.entries(colors).reduce((out, [from, to]) => out.replaceAll(from, to), svg);
const suffix = (id) => (id === 'classic' ? '' : `-${id}`);

const ICONS = Object.entries(VARIANTS).flatMap(([id, colors]) => {
  const any = recolor(source, colors);
  const bleed = recolor(fullBleed, colors);
  return [
    { file: `pwa-192x192${suffix(id)}.png`, size: 192, svg: any },
    { file: `pwa-512x512${suffix(id)}.png`, size: 512, svg: any },
    { file: `maskable-icon-512x512${suffix(id)}.png`, size: 512, svg: bleed },
    { file: `apple-touch-icon${suffix(id)}.png`, size: 180, svg: bleed },
  ];
});

// SVG de cada variante (vista previa en la bienvenida y en Ajustes).
for (const [id, colors] of Object.entries(VARIANTS)) {
  if (id === 'classic') continue;
  await writeFile(new URL(`icon-${id}.svg`, PUBLIC_DIR), recolor(source, colors));
  console.log(`public/icon-${id}.svg`);
}

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
