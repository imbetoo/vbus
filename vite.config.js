import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// VigoBusAPI no envía cabeceras CORS: en desarrollo, `/vigobus/*` se reenvía
// a la API (por defecto en local, puerto 5000) y el navegador solo habla con
// Vite. `VIGOBUS_PROXY_TARGET` cambia el destino.
const vigobusProxy = {
  '/vigobus': {
    target: process.env.VIGOBUS_PROXY_TARGET || 'http://localhost:5000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/vigobus/, ''),
  },
};

// PWA instalable: manifest + service worker (Workbox) que precachea el build,
// así la app abre al instante y sin conexión. Los tiempos de VigoBusAPI no se
// guardan nunca: siempre van a la red.
//
// Actualizaciones (OTA): `prompt`. El service worker nuevo se instala en
// segundo plano y espera; la app lo detecta (`useAppUpdate`, también al
// volver a ella y cada hora) y enseña "Nueva versión de vBus disponible".
// "Actualizar" le manda `SKIP_WAITING`: toma el control, borra lo que ya no
// está en el build (`cleanupOutdatedCaches` y el precache de Workbox) y la
// página se recarga con el código nuevo entero (HTML, JS y CSS).
const MANIFEST = {
  name: 'vBus',
  short_name: 'vBus',
  description: 'Tus rutinas de Vitrasa con los tiempos de llegada de un vistazo.',
  lang: 'es',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  // Navy del modo oscuro: barra de estado y pantalla de arranque.
  theme_color: '#1D2D44',
  background_color: '#1D2D44',
  // Icono maestro vectorial (public/icon.svg) y sus PNG (`npm run icons`).
  icons: [
    { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  // Accesos directos al mantener pulsado el icono (Android y escritorio; iOS
  // no los admite en apps web). La app lee `?accion=` al arrancar
  // (Dashboard). Iconos: `npm run icons`.
  shortcuts: [
    {
      name: 'Escanear QR de la parada',
      short_name: 'Escanear QR',
      description: 'Abre la cámara para leer el QR de la marquesina',
      url: '/?accion=escanear',
      icons: [{ src: 'shortcut-scan.png', sizes: '192x192', type: 'image/png' }],
    },
    {
      name: 'Buscar parada',
      short_name: 'Buscar parada',
      description: 'Consulta rápida: tiempos y líneas directas',
      url: '/?accion=buscar',
      icons: [{ src: 'shortcut-search.png', sizes: '192x192', type: 'image/png' }],
    },
    {
      name: 'Nueva tarjeta',
      short_name: 'Nueva tarjeta',
      description: 'Crea una tarjeta con tu parada y tus líneas',
      url: '/?accion=nueva',
      icons: [{ src: 'shortcut-new.png', sizes: '192x192', type: 'image/png' }],
    },
  ],
};

// Variantes del icono que se eligen antes de instalar (bienvenida y Ajustes,
// `src/lib/appIcon.js`): cada una tiene su manifest, igual que el de
// vite-plugin-pwa salvo los iconos (`npm run icons` genera sus PNG). La app
// cambia el `<link rel="manifest">` y el `apple-touch-icon` al elegir.
const ICON_VARIANTS = ['dark', 'neon'];
const variantManifests = {
  name: 'vbus-icon-manifests',
  generateBundle() {
    for (const id of ICON_VARIANTS) {
      const icons = MANIFEST.icons.map((icon) => ({
        ...icon,
        src: icon.src === 'icon.svg' ? `icon-${id}.svg` : icon.src.replace('.png', `-${id}.png`),
      }));
      this.emitFile({
        type: 'asset',
        fileName: `manifest-${id}.webmanifest`,
        source: JSON.stringify({ ...MANIFEST, icons }),
      });
    }
  },
};

const pwa = VitePWA({
  registerType: 'prompt',
  // El registro lo hace la app (`virtual:pwa-register/react`).
  injectRegister: false,
  includeAssets: ['icon.svg', 'apple-touch-icon.png'],
  manifest: MANIFEST,
  workbox: {
    // `json`: los recorridos del GTFS (`routes.json`), para el sentido de la
    // marcha en la consulta rápida también sin conexión. `webmanifest`: los
    // de las variantes del icono.
    globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
    // Los PNG de las variantes del icono solo los descarga el sistema al
    // instalar: no hace falta que todos los usuarios los lleven en el precache.
    globIgnores: ['**/*-dark.png', '**/*-neon.png'],
    // Las peticiones a la API no son páginas de la app.
    navigateFallbackDenylist: [/^\/vigobus/],
    // Tocar la notificación del modo viaje vuelve a la app (`public/`).
    importScripts: ['sw-notifications.js'],
    // Al activarse una versión nueva: fuera las cachés de versiones antiguas
    // de Workbox, y el service worker controla ya todas las ventanas.
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Inter (Google Fonts): hoja de estilos y ficheros de fuente.
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

// https://vite.dev/config/
// Versión visible en Ajustes (para saber si el móvil tiene el último build o
// uno antiguo del caché del service worker): versión de package.json ("v1.19":
// se sube con cada PR, `npm version minor`), hora de compilación y, en
// Vercel, el commit.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const BUILD_INFO = {
  version,
  time: new Date().toISOString(),
  commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
};

export default defineConfig({
  build: {
    // Los JSON importados con `?url` (routes.json) van siempre como fichero
    // propio, nunca incrustados como `data:`: así siempre están en el precache
    // del service worker y se pueden actualizar solos.
    assetsInlineLimit: (file) => (file.endsWith('.json') ? false : undefined),
  },
  define: {
    __BUILD_INFO__: JSON.stringify(BUILD_INFO),
  },
  plugins: [react(), pwa, variantManifests],
  server: { proxy: vigobusProxy },
  preview: { proxy: vigobusProxy },
});
