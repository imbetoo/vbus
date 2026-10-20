// Posición, tamaño, color y animación de cada mancha (colores sacados del
// mesh de Figma: base ice-100, banda clara ice-50, manchas navy y arco steel).
// `rotate` es la propiedad individual: se suma al `transform` animado.
const BLOBS = [
  'left-[20vw] top-[-15vh] h-[120vh] w-[55vw] bg-mesh-light [rotate:20deg] animate-mesh-1',
  'left-[68vw] top-0 h-[85vh] w-[70vw] bg-mesh-navy animate-mesh-2',
  'left-[-55vw] top-[45vh] h-[80vh] w-[110vw] bg-mesh-navy animate-mesh-3',
  'left-[5vw] top-[72vh] h-[55vh] w-[100vw] bg-mesh-steel animate-mesh-4',
];

/**
 * Fondo "mesh gradient" animado (inspirado en Apple Music). Cada mancha es un
 * radial-gradient que solo anima `transform`, así la GPU lo desplaza sin
 * repintar. La capa blanca al 35 % replica la de Figma.
 */
export default function MeshBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ice-100"
      aria-hidden="true"
    >
      {BLOBS.map((blob) => (
        <div key={blob} className={`absolute will-change-transform motion-reduce:animate-none ${blob}`} />
      ))}
      <div className="absolute inset-0 bg-white/35 dark:bg-navy-900/60" />
    </div>
  );
}
