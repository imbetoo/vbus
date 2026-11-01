import { BusFront, GraduationCap, House, MapPin, Pencil, X } from 'lucide-react';
import { memo, useId, useState } from 'react';
import { useNightMode } from '../../hooks/useNightMode';
import { useT } from '../../i18n';
import { busesOfLines } from '../../lib/lines';
import { formatDistance } from '../../lib/geo';
import { arrangeForNight } from '../../lib/nightMode';
import DepartureBell from '../departure/DepartureBell';
import WalkToStopButton from '../ui/WalkToStopButton';
import Collapse from '../ui/Collapse';
import DisclosureButton from '../ui/DisclosureButton';
import GlassCard from '../ui/GlassCard';
import IconButton from '../ui/IconButton';
import IconHeading from '../ui/IconHeading';
import { sortBuses } from '../../services/vigobusAdapter';
import BusLineItem from './BusLineItem';
import DayServiceEnded from './DayServiceEnded';
import TheoreticalArrivals from './TheoreticalArrivals';
import { cardColor } from './cardColors';

// Las rutinas guardan el icono por nombre para poder serializarse.
const ROUTE_ICONS = { GraduationCap, Home: House, Bus: BusFront };

const busKey = (bus) => bus.id ?? `${bus.line}-${bus.destination}-${bus.time}`;

/**
 * Tarjeta de una rutina. Ordena sus autobuses según `sortBy` (ajustes), enseña
 * los `busesToShow` primeros (elegidos al crearla) y "Ver más autobuses"
 * despliega el resto, haciendo crecer la tarjeta.
 * El fondo del icono usa el color elegido al crearla (`color`, ver
 * `cardColors.js`). `timeFormat` (ajustes): minutos que faltan o hora de
 * llegada, calculada desde `updatedAt` (cuándo llegaron los tiempos).
 * `onRemove(id)` y `onEditCard(id)` reciben el id: así el padre puede pasar
 * siempre las mismas funciones y `memo` evita repintados. En modo edición (`editing`) el lápiz sustituye a la
 * X de eliminar.
 * Fuera del modo edición, cada autobús lleva su campana (modo salida):
 * `onDepartureAlarm({ stop, bus, fetchedAt })`, también estable.
 * `nearMeters`: si ha subido la primera por cercanía (Smart Sorting), a
 * cuántos metros está su parada ("📍 A 120 m · La más cercana").
 * De noche (Smart Night Mode), las nocturnas con tiempo real van primero y
 * las diurnas ya terminadas, plegadas al final ("Servicio diurno
 * finalizado").
 * `failure`: si el último refresco de su parada falló (tipo de error), se
 * enseña el horario teórico del GTFS en gris (Feature #20); mientras carga,
 * los últimos tiempos guardados.
 * `onOpenLine({ stopId, bus })` (estable): tocar un autobús abre el visor
 * de línea (no en modo edición).
 */
function RouteCard({
  id,
  title,
  alias,
  note = '',
  stopId,
  stopName,
  icon,
  color,
  buses,
  lines,
  busesToShow = 3,
  sortBy = 'time',
  timeFormat = 'relative',
  updatedAt,
  editing = false,
  onRemove,
  onEditCard,
  onDepartureAlarm,
  nearMeters = null,
  failure = null,
  onOpenLine = null,
}) {
  const t = useT();
  const [showMore, setShowMore] = useState(false);
  const moreId = useId();
  const Icon = ROUTE_ICONS[icon] ?? House;
  const tone = cardColor(color);
  // Con alias ("Trabajo 💻"), el alias va de título y el nombre oficial de la
  // parada pasa al subtítulo; sin alias, el título es la parada y el
  // subtítulo dice su número. (Tarjetas antiguas sin `alias`: su `title`.)
  const name = alias ?? (title !== stopName ? title : '');
  const displayTitle = name || stopName || title;
  const subtitle = name || !stopId ? t('card.from', { stop: stopName }) : t('stop.fallback', { id: stopId });
  // Solo las líneas visibles de la tarjeta (`lines`, editables con el lápiz).
  const shown = busesOfLines(buses, lines);
  const night = useNightMode();
  // Solo se anima el cambio de día a noche con la app abierta: al abrirla,
  // las tarjetas guardadas aparecen directamente.
  const [nightAtMount] = useState(night);
  const sorted = sortBuses(shown, lines, sortBy);
  const { buses: arranged, ended } = night ? arrangeForNight(sorted, lines) : { buses: sorted, ended: null };
  const visible = arranged.slice(0, busesToShow);
  const more = arranged.slice(busesToShow);
  const stop = { id: stopId, name: stopName || t('stop.fallback', { id: stopId }) };
  const openLine = onOpenLine && stopId && !editing ? onOpenLine : null;
  const renderBus = (bus) => (
    <BusLineItem
      key={busKey(bus)}
      {...bus}
      timeFormat={timeFormat}
      fetchedAt={updatedAt}
      onOpen={openLine ? () => openLine({ stopId, bus }) : null}
      action={
        onDepartureAlarm && stopId && !editing ? (
          <DepartureBell bus={bus} onClick={() => onDepartureAlarm({ stop, bus, fetchedAt: updatedAt })} />
        ) : null
      }
    />
  );

  return (
    // `origin-top`: el rebote al pulsar no desplaza la tarjeta mientras crece.
    <GlassCard as="section" aria-label={displayTitle} className="origin-top">
      <div className="flex items-start gap-2">
        <IconHeading icon={Icon} iconTone={`${tone.bg} ${tone.icon}`} title={displayTitle} subtitle={subtitle} titleAs="h2" />
        {/* En modo edición, el lápiz ("Editar tarjeta") sustituye a la X. */}
        {editing ? (
          <IconButton
            icon={Pencil}
            size="sm"
            tone="dark"
            label={t('card.edit', { name: displayTitle })}
            aria-haspopup="dialog"
            onClick={() => onEditCard?.(id)}
            className="-mr-1 -mt-1 ml-auto"
          />
        ) : (
          // Cómo llegar andando a la parada y, a su lado, eliminar.
          <div className="-mr-1 -mt-1 ml-auto flex shrink-0 items-center gap-2">
            {stopId && <WalkToStopButton stop={{ id: stopId, name: stopName || t('stop.fallback', { id: stopId }) }} />}
            {onRemove && (
              <IconButton icon={X} size="sm" label={t('card.remove', { name: displayTitle })} onClick={() => onRemove(id)} />
            )}
          </div>
        )}
      </div>

      {/* Nota propia: una sola línea gris bajo el título (no mueve nada más). */}
      {note && (
        <p className="ml-[3.75rem] mt-1 truncate text-sm font-medium text-white/55" title={note}>
          {note}
        </p>
      )}

      {nearMeters != null && !editing && (
        <p className="ml-[3.75rem] mt-1 flex animate-fade-in items-center gap-1 text-sm font-semibold tabular-nums text-[#409CFF] motion-reduce:animate-none">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {t('card.nearest', { distance: formatDistance(nearMeters) })}
        </p>
      )}

      <div className="mx-1 mb-1 mt-3 border-t border-white/10" />

      {/* `key`: al pasar de día a noche (o al revés), la lista entra con un fundido. */}
      {failure && stopId ? (
        <div className="px-1">
          <TheoreticalArrivals
            stopId={stopId}
            lines={lines}
            limit={busesToShow}
            offline={failure === 'offline'}
            timeFormat={timeFormat}
            onOpenLine={openLine}
            fallback={<ul>{visible.map(renderBus)}</ul>}
          />
        </div>
      ) : (
        <ul
          key={night ? 'night' : 'day'}
          className={`px-1 ${night !== nightAtMount ? 'animate-fade-in motion-reduce:animate-none' : ''}`}
        >
          {visible.map(renderBus)}
        </ul>
      )}

      {!failure && more.length > 0 && (
        <>
          <Collapse id={moreId} open={showMore}>
            <ul className="px-1">
              {more.map(renderBus)}
            </ul>
          </Collapse>

          <div className="mt-1 px-2">
            <DisclosureButton
              expanded={showMore}
              onToggle={() => setShowMore((value) => !value)}
              controls={moreId}
            >
              {t(showMore ? 'card.showLess' : 'card.showMore')}
            </DisclosureButton>
          </div>
        </>
      )}

      {!failure && ended && (
        <div className="px-1">
          <DayServiceEnded ended={ended} fetchedAt={updatedAt} />
        </div>
      )}
    </GlassCard>
  );
}

// Memorizada: con props iguales (la misma tarjeta, ajustes sin cambiar) no se
// vuelve a pintar cuando el Dashboard se re-renderiza (modo edición, reloj…).
export default memo(RouteCard);
