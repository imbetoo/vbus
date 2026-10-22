/**
 * Contenedor plegable: `grid-template-rows` 0fr → 1fr anima la altura real
 * del contenido sin medirla en JS, con la curva suave de las hojas de iOS
 * (`ease-smooth`, 450 ms). El contenido aparece cuando ya hay sitio (opacidad
 * con retardo) y se desvanece rápido antes de plegarse. Plegado queda `inert`
 * (sin foco ni lector de pantalla). `className` va al contenido.
 *
 * La columna se fija al ancho disponible (`minmax(0, 1fr)`): sin eso, la
 * rejilla crece hasta el ancho del texto más largo y rompe los `truncate`.
 */
export default function Collapse({ open, id, className = '', children }) {
  return (
    <div
      id={id}
      inert={!open}
      className={`grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows] duration-[450ms] ease-smooth motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={`transition-opacity ease-out motion-reduce:transition-none ${
            open ? 'opacity-100 delay-100 duration-300' : 'opacity-0 duration-150'
          } ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
