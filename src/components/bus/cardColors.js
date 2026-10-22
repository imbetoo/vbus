/**
 * Colores que se pueden elegir para la pastilla del icono de una tarjeta
 * (paso "Personaliza la tarjeta"). La tarjeta guarda el `id`; las clases van
 * escritas enteras para que Tailwind las incluya. En los colores claros el
 * icono va en negro para que se lea.
 */
export const CARD_COLORS = [
  { id: 'graphite', label: 'Grafito', bg: 'bg-graphite', icon: 'text-white' },
  { id: 'blue', label: 'Azul', bg: 'bg-[#0A84FF]', icon: 'text-white' },
  { id: 'sky', label: 'Celeste', bg: 'bg-[#64C8FF]', icon: 'text-black/80' },
  { id: 'green', label: 'Verde', bg: 'bg-[#4CD97B]', icon: 'text-black/80' },
  { id: 'orange', label: 'Naranja', bg: 'bg-[#FFA25C]', icon: 'text-black/80' },
  { id: 'pink', label: 'Rosa', bg: 'bg-[#FF8AC4]', icon: 'text-black/80' },
  { id: 'violet', label: 'Violeta', bg: 'bg-[#8C7CFF]', icon: 'text-white' },
  { id: 'maroon', label: 'Granate', bg: 'bg-[#9E2A1B]', icon: 'text-white' },
];

export const DEFAULT_CARD_COLOR = CARD_COLORS[0].id;

export function cardColor(id) {
  return CARD_COLORS.find((color) => color.id === id) ?? CARD_COLORS[0];
}
