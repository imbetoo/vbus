import IconTile from './IconTile';

/**
 * Cabecera de tarjeta: pastilla de icono, título bold y subtítulo medium.
 *
 * `wrap`: por defecto todo se recorta a una línea; `true` deja partirse título
 * y subtítulo; `'title'` solo el título, y el subtítulo se queda en una línea
 * (su altura no cambia aunque cambie el texto, así no mueve lo de debajo).
 */
export default function IconHeading({
  icon,
  iconStrokeWidth,
  title,
  subtitle,
  titleAs: Title = 'span',
  titleId,
  wrap = false,
}) {
  const titleFit = wrap ? 'text-pretty' : 'truncate';
  const subtitleFit = wrap === true ? 'text-pretty' : 'truncate';

  return (
    <span className="flex min-w-0 items-center gap-3">
      <IconTile icon={icon} strokeWidth={iconStrokeWidth} />
      <span className="min-w-0">
        <Title
          id={titleId}
          className={`block ${titleFit} text-xl/tight font-bold tracking-[-0.015em] min-[400px]:text-2xl/tight`}
        >
          {title}
        </Title>
        <span className={`block ${subtitleFit} text-base font-medium text-white/85`}>{subtitle}</span>
      </span>
    </span>
  );
}
