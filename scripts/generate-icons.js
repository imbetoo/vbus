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
import { APP_ICONS } from '../src/lib/appIconList.js';
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
// Cada variante: `colors` (colores del SVG maestro → los suyos) y, si hace
// falta, `bus` y `window` ([arriba, abajo]): los degradados de la carrocería y
// de los cristales se reescriben por su id (el blanco del autobús es el mismo
// `#FFFFFF` de los brillos, así que no basta con cambiar colores).
const VARIANTS = {
  classic: {},
  // Medianoche: grafito y negro (combina con las paletas Sombra y OLED); el
  // reflejo cian del cristal se queda como único acento.
  dark: {
    colors: {
      '#1F5BD8': '#3A3A3C',
      '#0B1E4A': '#050505',
      '#061233': '#000000',
      '#030A1F': '#000000',
      '#0E2A66': '#1C1C1E',
      '#163C8C': '#2C2C2E',
      '#DCE6F7': '#D1D1D6',
      '#5A6E96': '#6E6E73',
    },
  },
  // Neón: magenta y morado profundo con cristales cian neón (paleta Cyberpunk).
  neon: {
    colors: {
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
  },
  // Día: Medianoche invertido. Lienzo blanco perla y autobús negro con
  // cristales grafito y el reflejo cian.
  light: {
    colors: {
      '#1F5BD8': '#FFFFFF',
      '#0B1E4A': '#C7C7CC',
      '#061233': '#3A3A3C',
      '#030A1F': '#8E8E93',
      '#5A6E96': '#000000',
    },
    bus: ['#3A3A3C', '#0A0A0A'],
    window: ['#5A5A5E', '#2C2C2E'],
  },
  // Coral: rojo iOS a granate, autobús blanco.
  coral: {
    colors: {
      '#1F5BD8': '#FF5A4E',
      '#0B1E4A': '#6B0A12',
      '#061233': '#3D0409',
      '#030A1F': '#250206',
      '#0E2A66': '#5C0A12',
      '#163C8C': '#8C1420',
      '#DCE6F7': '#FBE3E1',
      '#5A6E96': '#9A5A60',
    },
  },
  // Bosque: verde iOS a verde musgo profundo.
  forest: {
    colors: {
      '#1F5BD8': '#34C759',
      '#0B1E4A': '#0A3A1E',
      '#061233': '#04200F',
      '#030A1F': '#021208',
      '#0E2A66': '#0A3A22',
      '#163C8C': '#145A34',
      '#DCE6F7': '#E1F5E7',
      '#5A6E96': '#5A8A6C',
    },
  },
  // Ámbar: naranja a tostado, autobús crema.
  amber: {
    colors: {
      '#1F5BD8': '#FF9F0A',
      '#0B1E4A': '#7A2E05',
      '#061233': '#3D1602',
      '#030A1F': '#250C01',
      '#0E2A66': '#5C2405',
      '#163C8C': '#8A3A08',
      '#DCE6F7': '#FBEBD5',
      '#5A6E96': '#9A6A4A',
    },
  },
  // Limón: amarillo intenso con el autobús en negro y cristales ámbar.
  lemon: {
    colors: {
      '#1F5BD8': '#FFE14D',
      '#0B1E4A': '#E0A800',
      '#061233': '#5C4300',
      '#030A1F': '#7A5A00',
      '#5A6E96': '#000000',
    },
    bus: ['#2C2C2E', '#050505'],
    window: ['#FFC21A', '#C98A00'],
  },
  // Océano: turquesa a azul petróleo.
  ocean: {
    colors: {
      '#1F5BD8': '#30C6E0',
      '#0B1E4A': '#073B4C',
      '#061233': '#03222C',
      '#030A1F': '#02151B',
      '#0E2A66': '#07384A',
      '#163C8C': '#0C5670',
      '#DCE6F7': '#DDF4F8',
      '#5A6E96': '#4F8090',
    },
  },
};
if (Object.keys(VARIANTS).join() !== APP_ICONS.join()) {
  throw new Error('VARIANTS no coincide con APP_ICONS (src/lib/appIconList.js)');
}
const gradient = (svg, id, [top, bottom]) =>
  svg.replace(
    new RegExp(`(<linearGradient id="${id}"[^>]*>)[\\s\\S]*?(</linearGradient>)`),
    `$1\n      <stop offset="0" stop-color="${top}" />\n      <stop offset="1" stop-color="${bottom}" />\n    $2`,
  );
const recolor = (svg, { colors = {}, bus, window } = {}) => {
  let out = Object.entries(colors).reduce((acc, [from, to]) => acc.replaceAll(from, to), svg);
  if (bus) out = gradient(out, 'bus-fill', bus);
  if (window) out = gradient(out, 'window', window);
  return out;
};
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
