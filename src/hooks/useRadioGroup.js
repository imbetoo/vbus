import { useRef } from 'react';

/**
 * Comportamiento de teclado de un grupo de radios a medida (controles
 * segmentados, selector de color): solo la opción elegida entra en el orden de
 * Tab y las flechas cambian de opción, moviendo el foco con ella.
 *
 * Devuelve `itemProps(i)` con `ref`, `role`, `aria-checked`, `tabIndex` y
 * `onKeyDown` para el botón de la opción `i`.
 */
export function useRadioGroup(count, selectedIndex, onSelect) {
  const refs = useRef([]);

  const move = (next) => {
    const index = (next + count) % count;
    onSelect(index);
    refs.current[index]?.focus();
  };

  return (i) => ({
    ref: (el) => {
      refs.current[i] = el;
    },
    role: 'radio',
    'aria-checked': i === selectedIndex,
    tabIndex: i === selectedIndex ? 0 : -1,
    onKeyDown: (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        move(i + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        move(i - 1);
      }
    },
  });
}
