import LineBadge from '../bus/LineBadge';

/** Selector múltiple de líneas: cada badge es un botón que se marca. */
export default function LineChips({ lines, selected, onToggle }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {lines.map(({ line, color }) => {
        const pressed = selected.includes(line);

        return (
          <li key={line}>
            <LineBadge
              as="button"
              type="button"
              line={line}
              color={color}
              aria-pressed={pressed}
              onClick={() => onToggle(line)}
              className={`transition duration-300 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                pressed ? 'ring-2 ring-white ring-offset-2 ring-offset-graphite' : 'opacity-50'
              }`}
            />
          </li>
        );
      })}
    </ul>
  );
}
