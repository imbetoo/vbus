import { Search } from 'lucide-react';
import { useT } from '../../i18n';
import { PRESSABLE } from '../ui/pressable';

/**
 * Barra de búsqueda de Mis rutas, al estilo de la de iOS: en realidad es un
 * botón que abre la consulta rápida. Lleva los mismos colores que las
 * tarjetas (`GlassCard`: grafito al 80 %, degradado, borde de 2px y
 * `shadow-glass`), así sigue al motor de temas sin colores propios.
 */
export default function SearchBar({ onClick }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`${t('dashboard.quickLook')}: ${t('quick.searchBar')}`}
      className={`flex h-12 w-full items-center gap-2.5 rounded-2xl border-2 border-white/15 bg-graphite/80 bg-gradient-to-b from-white/[0.08] to-white/0 px-3.5 text-left shadow-glass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:border-graphite/60 ${PRESSABLE}`}
    >
      <Search className="h-5 w-5 shrink-0 text-white/60" strokeWidth={2.5} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-lg font-medium text-white/50">{t('quick.searchBar')}</span>
    </button>
  );
}
