import { memo } from 'react';

// Cada mancha es una elipse de ≥ 90vmax centrada en (X, Y) con
// `calc(X - mitad)`, sin `-translate-*`, que chocaría con la animación.
// La blanca va al final: es la banda luminosa protagonista. `lite`: las que
// se quedan con el fondo ligero (azul, lavanda y perla).
const BLOBS = [
  // Azul celuloide, arriba a la izquierda.
  { lite: true, className: 'left-[calc(15vw-55vmax)] top-[calc(15vh-40vmax)] h-[80vmax] w-[110vmax] bg-mesh-blue animate-mesh-1' },
  // Lavanda, a la derecha.
  { lite: true, className: 'left-[calc(90vw-47.5vmax)] top-[calc(45vh-55vmax)] h-[110vmax] w-[95vmax] bg-mesh-lavender animate-mesh-2' },
  // Índigo apagado, abajo a la izquierda (profundidad).
  { lite: false, className: 'left-[calc(5vw-40vmax)] top-[calc(90vh-35vmax)] h-[70vmax] w-[80vmax] bg-mesh-indigo animate-mesh-4' },
  // Azul rosáceo, abajo a la derecha (brillo iridiscente).
  { lite: false, className: 'left-[calc(85vw-45vmax)] top-[calc(95vh-35vmax)] h-[70vmax] w-[90vmax] bg-mesh-rose animate-mesh-5' },
  // Blanco perla, banda central.
  { lite: true, className: 'left-[calc(50vw-50vmax)] top-[calc(55vh-30vmax)] h-[60vmax] w-[100vmax] bg-mesh-pearl animate-mesh-3' },
];

/**
 * Fondo "mesh gradient" (perla iridiscente en la paleta Vigo, inspirado en
 * Apple Music). Las manchas solo animan `transform`, así la GPU las mueve sin
 * repintar. Encima van dos capas estáticas: un velo ligero que suaviza los
 * tonos y un grano fino que da el acabado de luz helada sin el coste de un
 * `backdrop-blur`. Con `lite` solo se pintan 3 manchas: menos capas que la
 * GPU mueve en cada fotograma (ajuste "Fondo" para móviles con tirones).
 *
 * Colores (paleta) y velocidad (dinamismo) no pasan por aquí: son variables
 * CSS de `<html>` (`src/lib/appearance.js`, `index.css`), así que cambiar de
 * tema no vuelve a renderizar nada. Memorizado: solo se repinta si cambian
 * `lite` u `oled`. Con `oled` (negro puro) no se monta nada: sin capas que
 * componer, la GPU descansa y los píxeles OLED se apagan.
 */
function MeshBackground({ lite = false, oled = false }) {
  if (oled) return null;

  return (
    <div
      className="mesh-layer pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pearl"
      aria-hidden="true"
    >
      {BLOBS.filter((blob) => !lite || blob.lite).map((blob) => (
        <div
          key={blob.className}
          className={`absolute will-change-transform motion-reduce:animate-none ${blob.className}`}
        />
      ))}
      <div className="mesh-veil absolute inset-0" />
      <div className="absolute inset-0 bg-grain bg-[length:160px_160px] opacity-[0.06] dark:opacity-[0.04]" />
    </div>
  );
}

export default memo(MeshBackground);
