import IconTile from './IconTile';

/**
 * Cabecera de tarjeta: pastilla de icono, título extrabold y subtítulo
 * semibold. Por defecto recorta el texto; con `wrap` lo deja partirse.
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
  const fit = wrap ? 'text-pretty' : 'truncate';

  return (
    <span className="flex min-w-0 items-center gap-3">
      <IconTile icon={icon} strokeWidth={iconStrokeWidth} />
      <span className="min-w-0">
        <Title
          id={titleId}
          className={`block ${fit} text-xl/tight font-extrabold tracking-tight min-[400px]:text-2xl/tight`}
        >
          {title}
        </Title>
        <span className={`block ${fit} text-base font-semibold text-white/90`}>{subtitle}</span>
      </span>
    </span>
  );
}
