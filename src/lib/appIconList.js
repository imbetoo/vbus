/**
 * Variantes del icono de la app (sin dependencias: la usan la app,
 * `vite.config.js` para emitir sus manifests y `scripts/generate-icons.js`
 * para comprobar que tiene los PNG de todas).
 * - `MAIN_APP_ICONS`: siempre a la vista en el selector.
 * - `EXTRA_APP_ICONS`: en el desplegable "Más iconos" (no son lo principal).
 */
export const MAIN_APP_ICONS = ['classic', 'dark', 'neon'];
export const EXTRA_APP_ICONS = ['light', 'coral', 'forest', 'amber', 'lemon', 'ocean'];
export const APP_ICONS = [...MAIN_APP_ICONS, ...EXTRA_APP_ICONS];
