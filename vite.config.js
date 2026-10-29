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
const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'VigoBus',
    short_name: 'VigoBus',
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
  },
  workbox: {
    // `json`: los recorridos del GTFS (`routes.json`), para el sentido de la
    // marcha en la consulta rápida también sin conexión.
    globPatterns: ['**/*.{js,css,html,svg,png,json}'],
    // Las peticiones a la API no son páginas de la app.
    navigateFallbackDenylist: [/^\/vigobus/],
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
export default defineConfig({
  plugins: [react(), pwa],
  server: { proxy: vigobusProxy },
  preview: { proxy: vigobusProxy },
});
