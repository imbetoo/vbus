import { ArrowUpRight, Map as MapIcon } from 'lucide-react';
import PillButton from '../ui/PillButton';
import { PRESSABLE } from '../ui/pressable';

/**
 * Enlace a la ruta en Google Maps (transporte público, con transbordos si
 * hacen falta). Es un `<a>` normal en una pestaña nueva: el sistema operativo
 * decide abrirlo en la app nativa de Maps si está instalada.
 *
 * `primary`: píldora blanca (acción principal, cuando no hay línea directa);
 * si no, botón de cristal destacado al final de los resultados.
 */
export default function MapsLink({ href, primary = false, children }) {
  const content = (
    <>
      <MapIcon className={`h-5 w-5 ${primary ? '' : 'text-accent'}`} strokeWidth={2.5} aria-hidden="true" />
      {children}
      <ArrowUpRight className="h-4 w-4 opacity-60" strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only"> (se abre en Google Maps)</span>
    </>
  );

  if (primary) {
    return (
      <PillButton as="a" href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </PillButton>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-lg font-semibold text-white shadow-relief active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
    >
      {content}
    </a>
  );
}
