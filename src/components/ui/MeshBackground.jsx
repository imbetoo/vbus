// Cada mancha es una elipse de ≥ 90vmax centrada en (X, Y) con
// `calc(X - mitad)`, sin `-translate-*`, que chocaría con la animación.
// La blanca va al final: es la banda luminosa protagonista.
const BLOBS = [
  // Azul celuloide, arriba a la izquierda.
  'left-[calc(15vw-55vmax)] top-[calc(15vh-40vmax)] h-[80vmax] w-[110vmax] bg-mesh-blue animate-mesh-1',
  // Lavanda, a la derecha.
  'left-[calc(90vw-47.5vmax)] top-[calc(45vh-55vmax)] h-[110vmax] w-[95vmax] bg-mesh-lavender animate-mesh-2',
  // Índigo apagado, abajo a la izquierda (profundidad).
  'left-[calc(5vw-40vmax)] top-[calc(90vh-35vmax)] h-[70vmax] w-[80vmax] bg-mesh-indigo animate-mesh-4',
  // Azul rosáceo, abajo a la derecha (brillo iridiscente).
  'left-[calc(85vw-45vmax)] top-[calc(95vh-35vmax)] h-[70vmax] w-[90vmax] bg-mesh-rose animate-mesh-5',
  // Blanco perla, banda central.
  'left-[calc(50vw-50vmax)] top-[calc(55vh-30vmax)] h-[60vmax] w-[100vmax] bg-mesh-pearl animate-mesh-3',
];

/**
 * Fondo "mesh gradient" perla iridiscente (inspirado en Apple Music). Las
 * manchas solo animan `transform`, así la GPU las mueve sin repintar. Encima
 * van dos capas estáticas: un velo blanco que pasteliza los tonos y un grano
 * fino que da el acabado de luz helada sin el coste de un `backdrop-blur`.
 */
export default function MeshBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pearl"
      aria-hidden="true"
    >
      {BLOBS.map((blob) => (
        <div key={blob} className={`absolute will-change-transform motion-reduce:animate-none ${blob}`} />
      ))}
      <div className="absolute inset-0 bg-white/40 transition-colors duration-700 ease-in-out dark:bg-navy-900/55" />
      <div className="absolute inset-0 bg-grain bg-[length:160px_160px] opacity-[0.06] transition-opacity duration-700 ease-in-out dark:opacity-[0.04]" />
    </div>
  );
}
