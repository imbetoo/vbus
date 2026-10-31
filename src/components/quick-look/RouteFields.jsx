import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpDown, CircleDot, LoaderCircle, MapPin, Navigation, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import IconButton from '../ui/IconButton';
import { useT } from '../../i18n';

// Giro del botón de invertir: muelle corto, como los controles de iOS.
const SWAP_SPRING = { type: 'spring', stiffness: 260, damping: 22 };

/**
 * Campos Origen (A) y Destino (B) de la consulta rápida, al estilo de Apple
 * Maps: un único bloque de cristal con los dos campos, una línea punteada que
 * los une y, a la derecha, el botón ⇄ que invierte el trayecto (gira media
 * vuelta con framer-motion).
 *
 * Cada campo es un combobox: al enfocarlo se escribe una calle o un número y
 * las sugerencias salen debajo del bloque (las pinta el padre en
 * `listId`). Sin editar, enseña la parada elegida o, en el origen, "Mi
 * ubicación actual" en azul. La X limpia el campo.
 */
export default function RouteFields({
  origin,
  destination,
  activeField,
  query,
  listId,
  activeDescendant,
  expanded,
  originInputRef,
  destinationInputRef,
  onFocus,
  onBlur,
  onQueryChange,
  onKeyDown,
  onClear,
  onSwap,
}) {
  const t = useT();
  const reduceMotion = useReducedMotion();
  // Medias vueltas acumuladas: cada pulsación gira 180° más.
  const [turns, setTurns] = useState(0);
  const field = (name) => ({
    editing: activeField === name,
    value: activeField === name ? query : name === 'origin' ? origin.text : destination.text,
    expanded: activeField === name && expanded,
    listId,
    activeDescendant: activeField === name ? activeDescendant : undefined,
    onFocus: () => onFocus(name),
    onBlur: () => onBlur(name),
    onChange: onQueryChange,
    onKeyDown,
    onClear: () => onClear(name),
  });

  return (
    <div
      role="group"
      aria-label={t('quick.route')}
      className="relative flex items-center rounded-3xl border border-white/10 bg-white/[0.06] transition-[border-color,box-shadow] duration-300 ease-spring focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40"
    >
      {/* Línea punteada entre los iconos de A y B (filas de 56 px). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[25px] top-[38px] h-[37px] border-l-2 border-dotted border-white/25"
      />
      <div className="min-w-0 flex-1">
        <RouteField
          {...field('origin')}
          inputRef={originInputRef}
          label={t('quick.origin')}
          placeholder={t('quick.origin.placeholder')}
          accent={origin.isLocation}
          icon={
            origin.locating ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-accent motion-reduce:animate-none" strokeWidth={2.5} />
            ) : origin.isLocation ? (
              <Navigation className="h-5 w-5 fill-accent text-accent" strokeWidth={2} />
            ) : (
              <CircleDot className="h-5 w-5 text-white/60" strokeWidth={2.5} />
            )
          }
        />
        <div className="ml-12 h-px bg-white/10" aria-hidden="true" />
        <RouteField
          {...field('destination')}
          inputRef={destinationInputRef}
          label={t('quick.destination')}
          placeholder={t('quick.destination.placeholder')}
          icon={<MapPin className="h-5 w-5 text-urgent" strokeWidth={2.5} />}
        />
      </div>

      <div className="shrink-0 pr-2">
        <IconButton
          label={t('quick.swap')}
          disabled={!origin.text && !destination.text}
          onClick={() => {
            setTurns((value) => value + 1);
            onSwap();
          }}
          className="disabled:opacity-40"
        >
          <motion.span
            className="flex will-change-transform"
            animate={{ rotate: turns * 180 }}
            transition={reduceMotion ? { duration: 0 } : SWAP_SPRING}
          >
            <ArrowUpDown className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
          </motion.span>
        </IconButton>
      </div>
    </div>
  );
}

/**
 * Un campo del trayecto. Al empezar a editar selecciona su texto, así lo que
 * se escriba lo sustituye (como en Maps); Escape deja de editar sin cerrar el
 * panel (lo gestiona `onKeyDown`).
 */
function RouteField({
  inputRef,
  label,
  icon,
  accent = false,
  placeholder,
  editing,
  value,
  expanded,
  listId,
  activeDescendant,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  onClear,
}) {
  const t = useT();
  const id = useId();
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing, inputRef]);

  return (
    <div className="flex h-14 items-center gap-3 pl-4 pr-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="flex w-5 shrink-0 justify-center" aria-hidden="true">
        {icon}
      </span>
      <input
        id={id}
        ref={inputRef}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={activeDescendant}
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        // Azul accesible de iOS (sobre grafito) para "Mi ubicación actual".
        className={`h-full min-w-0 flex-1 truncate bg-transparent text-lg font-medium placeholder:font-normal placeholder:text-white/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
          accent && !editing ? 'text-[#409CFF]' : 'text-white'
        }`}
      />
      {value && (
        <IconButton
          icon={X}
          size="sm"
          label={t('quick.clearField', { field: label.toLowerCase() })}
          // Sin quitar el foco al campo que se está editando.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
          className="animate-fade-in motion-reduce:animate-none"
        />
      )}
    </div>
  );
}
