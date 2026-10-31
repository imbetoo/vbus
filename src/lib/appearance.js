import { flushSync } from 'react-dom';
import { prefersReducedMotion } from './motion';

/**
 * Motor de temas: paleta del fondo y de los acentos, y velocidad de las
 * manchas. Los colores viven solo en el CSS (`index.css`, bloques
 * `[data-palette='…']` con variables RGB); aquí solo se escriben dos
 * atributos en `<html>` cuando el usuario elige, y el compositor hace el
 * resto: ningún re-render de React mientras el fondo se mueve.
 *
 * `scheme`: las paletas oscuras (o casi blancas) fijan el modo; si no, manda
 * el botón Sol/Luna. Sus nombres están en `src/i18n` (`palette.<id>`; la
 * velocidad, `motion.<id>`).
 */
export const PALETTES = [
  { id: 'vigo', scheme: null },
  { id: 'nature', scheme: null },
  { id: 'sunset', scheme: null },
  { id: 'ocean', scheme: null },
  { id: 'cyberpunk', scheme: 'dark' },
  { id: 'lavender', scheme: null },
  { id: 'cloud', scheme: 'light' },
  { id: 'shadow', scheme: 'dark' },
  { id: 'oled', scheme: 'dark' },
];

/** Velocidad de las manchas (`--mesh-speed` en `index.css`). */
export const MOTIONS = [
  { value: 'fluid' },
  { value: 'relaxed' },
  { value: 'static' },
];

const byId = new Map(PALETTES.map((palette) => [palette.id, palette]));

const THEME_KEY = 'vbus:theme';

/**
 * Tema elegido con el Sol/Luna (`vbus:theme`) o, si no se eligió, el del
 * sistema. Misma regla que el script de `index.html`.
 */
export function chosenTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Sin almacenamiento disponible: se sigue al sistema.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** La paleta `id` (o la de Vigo si no existe). */
export const paletteOf = (id) => byId.get(id) ?? PALETTES[0];

/** Modo que fija la paleta (`light`, `dark`) o `null` si manda el Sol/Luna. */
export const forcedScheme = (id) => paletteOf(id).scheme;

/**
 * Pinta la apariencia en `<html>`: `data-palette`, `data-motion` y la clase
 * `dark`: la que fija la paleta o, si no fija ninguna, la elegida con el
 * Sol/Luna (que nunca se toca: vuelve al dejar una paleta oscura).
 */
export function applyAppearance({ palette, motion }) {
  const root = document.documentElement;
  if (palette) {
    root.dataset.palette = palette;
    root.classList.toggle('dark', (forcedScheme(palette) ?? chosenTheme()) === 'dark');
  }
  if (motion) root.dataset.motion = motion;
}

/**
 * Cambia la apariencia con el mismo fundido de página entera que el Sol/Luna
 * (View Transitions, 500 ms): fondo, acentos y modo cambian a la vez.
 * `commit` actualiza el estado de React (se fuerza dentro de la captura).
 */
export function changeAppearance(next, commit) {
  const apply = () => {
    applyAppearance(next);
    flushSync(commit);
  };
  if (!document.startViewTransition || prefersReducedMotion()) {
    apply();
    return;
  }
  const root = document.documentElement;
  root.classList.add('theme-switching');
  document.startViewTransition(apply).finished.finally(() => root.classList.remove('theme-switching'));
}
