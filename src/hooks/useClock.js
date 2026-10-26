import { useEffect, useState } from 'react';

const formatTime = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/**
 * Hora actual en `hh:mm`. Se actualiza justo al cambiar el minuto (no cada
 * segundo), y al volver a la pestaña tras tenerla en segundo plano.
 */
export function useClock() {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    let timer;
    const tick = () => {
      const now = new Date();
      setTime(formatTime(now));
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      tick();
    };
    timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return time;
}
