/**
 * "Live Activity" de la pantalla de bloqueo (Feature #19) con la Media
 * Session API: mientras hay un aviso activo (modo viaje o salida), el widget
 * de música del sistema enseña lo que queda como título ("En 3 min") y la
 * línea y la parada como artista ("C3i · Rúa do Porriño").
 *
 * iOS y Android solo enseñan ese widget si la página está reproduciendo
 * audio, así que se reproduce en bucle un WAV de silencio de 1 s, sintetizado
 * en memoria (sin red ni assets), a volumen casi nulo: no suena nada. Tiene
 * que empezar dentro de un gesto (Safari): `startLockScreen` se llama desde
 * `startFocus` y `restoreFocus`.
 *
 * Estado de módulo, sin React: un único `Audio` y un `MediaMetadata` nuevo
 * solo cuando cambia el texto. `stopLockScreen` lo suelta todo (sin fugas).
 * Sin Media Session o sin `Audio`, todo es no-op.
 */

const SAMPLE_RATE = 8_000;
const ARTWORK = [
  { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
  { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
];

let audio = null;
let silenceUrl = null;
let active = false;
let lastKey = '';

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

/** WAV PCM de 16 bits con 1 s de silencio, como URL de un `Blob` (una vez). */
function silence() {
  if (silenceUrl) return silenceUrl;
  const length = SAMPLE_RATE;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (at, value) => [...value].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length * 2, true);
  // Las muestras ya son 0 (silencio).
  silenceUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  return silenceUrl;
}

function play() {
  try {
    audio?.play()?.catch?.(() => {});
  } catch {
    // Sin permiso de reproducción: el aviso sigue igual, sin widget.
  }
}

function setHandlers(handler) {
  for (const action of ['play', 'pause', 'stop']) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Acción no admitida en este navegador.
    }
  }
}

/** Empieza (o recupera) el widget. Llamar dentro del toque del usuario. */
export function startLockScreen() {
  if (!supported() || typeof Audio === 'undefined') return;
  try {
    if (!audio) {
      audio = new Audio(silence());
      audio.loop = true;
      audio.volume = 0.01;
      audio.setAttribute?.('playsinline', '');
    }
    active = true;
    play();
    // "Pausa" desde el widget no lo quita: es un aviso, no música.
    setHandlers(() => {
      if (!active) return;
      play();
      navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.playbackState = 'playing';
  } catch {
    // Sin audio: sin widget.
  }
}

/** Título y artista del widget; no hace nada si no han cambiado. */
export function updateLockScreen({ title, artist, album = 'vBus' }) {
  if (!active || !supported() || typeof MediaMetadata === 'undefined') return;
  const key = `${title}\u0000${artist}\u0000${album}`;
  if (key === lastKey) return;
  lastKey = key;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork: ARTWORK });
    navigator.mediaSession.playbackState = 'playing';
  } catch {
    // Metadatos no admitidos: el aviso sigue en pantalla.
  }
}

/** Quita el widget y suelta el audio (al terminar el modo). */
export function stopLockScreen() {
  active = false;
  lastKey = '';
  if (audio) {
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    } catch {
      // Ya estaba parado.
    }
    audio = null;
  }
  if (!supported()) return;
  try {
    setHandlers(null);
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  } catch {
    // Nada que limpiar.
  }
}
