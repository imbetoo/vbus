import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * Código QR de `value`, generado en el cliente (`uqr`, sin servicios
 * externos) y pintado como un único `<path>` SVG: módulos negros sobre
 * blanco con su margen de silencio, nítido a cualquier tamaño. Corrección de
 * errores M (15 %): aguanta reflejos y pantallas con brillo bajo.
 */
export default function QrCode({ value, label, className = '' }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 });
    let d = '';
    qr.data.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      });
    });
    return { size: qr.size, path: d };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`block bg-white ${className}`}
    >
      <path d={path} fill="#000" />
    </svg>
  );
}
