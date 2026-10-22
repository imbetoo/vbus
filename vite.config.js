import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: vigobusProxy },
  preview: { proxy: vigobusProxy },
});
