/**
 * Cómo avisan los modos viaje y salida: notificación del sistema, vibración
 * y un sonido.
 * Cada uno se usa si el navegador lo permite; ninguno lanza errores.
 *
 * - Notificaciones: Chrome Android y escritorio; en iPhone, solo con vBus
 *   añadida a la pantalla de inicio (iOS 16.4+). Se muestran desde el
 *   service worker (en Android, `new Notification()` no está permitido) y
 *   tocarla vuelve a la app (`public/sw-notifications.js`).
 * - Vibración (`haptics.js`): solo Android (iOS no tiene `navigator.vibrate`).
 * - Sonido: un `Audio` a todo volumen, desbloqueado en el toque de "Avisarme"
 *   (Safari no deja sonar audio que no empiece con un gesto).
 */

import { ALARM_PATTERN, haptics, hapticsEnabled } from './haptics';

const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * Estado de las notificaciones: `granted`, `denied`, `default` (aún no se ha
 * preguntado), `ios-install` (iPhone en Safari: hay que añadir vBus a la
 * pantalla de inicio) o `unsupported`.
 */
export function notificationStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return IS_IOS && !isStandalone() ? 'ios-install' : 'unsupported';
  }
  return Notification.permission;
}

/**
 * Pide permiso para notificar (debe llamarse desde un toque del usuario). No
 * bloquea nada: devuelve una promesa con el estado final que nunca rechaza.
 * Safari antiguo usa la versión con callback en vez de promesa.
 */
export function requestNotificationPermission() {
  const status = notificationStatus();
  if (status !== 'default') return Promise.resolve(status);
  return new Promise((resolve) => {
    try {
      const result = Notification.requestPermission((permission) => resolve(permission));
      result?.then?.(resolve, () => resolve(notificationStatus()));
    } catch {
      resolve(notificationStatus());
    }
  });
}

/** Muestra una notificación del sistema. Devuelve si se pudo. */
export async function showNotification(title, options = {}) {
  if (notificationStatus() !== 'granted') return false;
  const full = { icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', lang: 'es', ...options };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, full);
      return true;
    }
  } catch {
    // Se prueba sin service worker.
  }
  try {
    new Notification(title, full);
    return true;
  } catch {
    return false;
  }
}

/** Quita la notificación con esa etiqueta (al terminar el viaje). */
export async function closeNotification(tag) {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const notifications = (await registration?.getNotifications({ tag })) ?? [];
    notifications.forEach((notification) => notification.close());
  } catch {
    // Nada que cerrar.
  }
}

/**
 * El aviso completo de los modos viaje y salida: vibración de alarma (fuerte
 * y larga, para notarla en el bolsillo), el timbre a todo volumen y la
 * notificación del sistema (si hay permiso; `tag` la reemplaza en vez de
 * apilarla y permite quitarla al terminar).
 */
export function fireAlert(title, { body, tag }) {
  haptics.alarm();
  playChime();
  return showNotification(title, {
    body,
    tag,
    renotify: true,
    requireInteraction: true,
    // Sin vibración en Ajustes, la notificación tampoco vibra.
    vibrate: hapticsEnabled() ? ALARM_PATTERN : [],
  });
}

/** Repite vibración y timbre (sin otra notificación) mientras el aviso sigue en pantalla. */
export function repeatAlert() {
  haptics.alarm();
  playChime();
}

/** Corta vibración y timbre (al cerrar el aviso). */
export function stopAlert() {
  haptics.stop();
  stopSounds();
}

// --- Sonido -------------------------------------------------------------
//
// El timbre es un `Audio` de verdad (un WAV generado aquí, sin descargar
// nada) con `volume = 1.0`: a diferencia de Web Audio, en iPhone un `<audio>`
// suena aunque el interruptor de silencio esté puesto, y no se pierde con el
// ruido de la calle. Si no puede sonar, Web Audio como plan B.
//
// Tres tonos a elegir en Ajustes ("Tono de alarma"), sintetizados con
// matemáticas: cada uno es una lista de notas `{ at, freq, dur, decay,
// partials }` (segundos, hercios, caída exponencial y armónicos `[razón,
// amplitud]`) que en el aviso suena dos veces (`repeatAt`) y en la
// previsualización de Ajustes, una.

const SAMPLE_RATE = 22_050;
// Campana: armónicos inarmónicos (como una campana de verdad) y caída larga.
const BELL = [
  [1, 0.55],
  [2.76, 0.22],
  [5.4, 0.1],
];

const TONES = {
  // Tres tonos ascendentes (como un timbre de autobús).
  classic: {
    repeatAt: [0, 1.1],
    notes: [880, 1109, 1319].map((freq, i) => ({ at: i * 0.28, freq, dur: 0.25, decay: 9, partials: [[1, 1]] })),
  },
  // Campanilla: Mi6 → Si5, suave y clara, con eco.
  chime: {
    repeatAt: [0, 1.6],
    notes: [
      { at: 0, freq: 1318.5, dur: 1.3, decay: 3.2, partials: BELL },
      { at: 0.38, freq: 987.8, dur: 1.3, decay: 3, partials: BELL },
    ],
  },
  // Urgente: cuatro pitidos cortos y agudos (con armónico impar, como un
  // despertador), que cortan el ruido de la calle.
  urgent: {
    repeatAt: [0, 0.75],
    notes: [0, 1, 2, 3].map((i) => ({
      at: i * 0.14,
      freq: 1800,
      dur: 0.09,
      decay: 4,
      partials: [
        [1, 0.75],
        [3, 0.25],
      ],
    })),
  },
};

/** Tonos de alarma, en el orden de Ajustes. */
export const ALARM_TONES = Object.keys(TONES);
const toneOf = (id) => TONES[id] ?? TONES.classic;

/** Lo que dura un tono, en segundos (`once`: la previsualización). */
export function toneDuration(id, { once = false } = {}) {
  const tone = toneOf(id);
  const end = Math.max(...tone.notes.map((note) => note.at + note.dur));
  return (once ? 0 : tone.repeatAt.at(-1)) + end;
}

/** Muestras del tono, normalizadas para no saturar. */
function synthesize(id, once) {
  const tone = toneOf(id);
  const length = Math.ceil(SAMPLE_RATE * (toneDuration(id, { once }) + 0.05));
  const samples = new Float32Array(length);
  for (const offset of once ? [0] : tone.repeatAt) {
    for (const { at, freq, dur, decay, partials } of tone.notes) {
      const begin = Math.floor((offset + at) * SAMPLE_RATE);
      const count = Math.floor(dur * SAMPLE_RATE);
      for (let i = 0; i < count; i++) {
        const t = i / SAMPLE_RATE;
        // Ataque de 8 ms, caída exponencial y 20 ms de salida: sin chasquidos.
        const envelope = Math.min(1, t / 0.008) * Math.exp(-t * decay) * Math.min(1, (dur - t) / 0.02);
        let value = 0;
        for (const [ratio, amplitude] of partials) value += amplitude * Math.sin(2 * Math.PI * freq * ratio * t);
        samples[begin + i] += envelope * value;
      }
    }
  }
  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0) {
    const gain = 0.95 / peak;
    for (let i = 0; i < length; i++) samples[i] *= gain;
  }
  return samples;
}

/** WAV PCM de 16 bits de un tono, como URL de un `Blob`. */
function toneWavUrl(id, once) {
  const samples = synthesize(id, once);
  const { length } = samples;
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
  for (let i = 0; i < length; i++) {
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

// Un `Audio` por tono (aviso y previsualización), creado al usarlo por primera vez.
const players = new Map();
function player(id, once) {
  const key = `${id}:${once ? 'preview' : 'alarm'}`;
  if (!players.has(key) && typeof Audio !== 'undefined') {
    const audio = new Audio(toneWavUrl(id, once));
    audio.preload = 'auto';
    players.set(key, audio);
  }
  return players.get(key) ?? null;
}

// Ajustes → "Tono de alarma" (`setAlarmTone`, lo sincroniza `App.jsx`).
let selectedTone = 'classic';
let audioContext = null;

/** Elige el tono de los avisos (`classic`, `chime` o `urgent`). */
export function setAlarmTone(id) {
  selectedTone = TONES[id] ? id : 'classic';
}

/**
 * Prepara el sonido del aviso. Llamar dentro del toque del usuario: Safari
 * solo deja sonar audio que se haya empezado en un gesto (aquí se reproduce
 * un instante en silencio y se para).
 */
export function unlockSound() {
  try {
    const chime = player(selectedTone, false);
    if (chime) {
      chime.volume = 1.0;
      chime.muted = true;
      chime
        .play()
        .then(() => {
          chime.pause();
          chime.currentTime = 0;
          chime.muted = false;
        })
        .catch(() => {
          chime.muted = false;
        });
    }
  } catch {
    // Sin `Audio`: queda Web Audio.
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext ??= new AudioContext();
    audioContext.resume?.().catch(() => {});
  } catch {
    audioContext = null;
  }
}

/** El timbre a todo volumen (`Audio` con `volume = 1.0`; si falla, Web Audio). */
export function playChime() {
  const chime = players.get(`${selectedTone}:alarm`);
  if (!chime) {
    playToneWebAudio(selectedTone);
    return;
  }
  try {
    chime.muted = false;
    chime.volume = 1.0;
    chime.currentTime = 0;
    chime.play().catch(() => playToneWebAudio(selectedTone));
  } catch {
    playToneWebAudio(selectedTone);
  }
}

/**
 * Escucha un tono en Ajustes (una vez, al 70 %): llamar desde el toque. Corta
 * cualquier otro que estuviera sonando. Devuelve lo que dura, en ms.
 */
export function previewTone(id) {
  stopSounds();
  try {
    const audio = player(id, true);
    if (audio) {
      audio.muted = false;
      audio.volume = 0.7;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  } catch {
    // Sin sonido.
  }
  return Math.round(toneDuration(id, { once: true }) * 1000);
}

// Para todos los tonos (aviso y previsualizaciones).
function stopSounds() {
  for (const audio of players.values()) {
    try {
      audio.pause();
    } catch {
      // Nada que parar.
    }
  }
}

function playToneWebAudio(id) {
  if (!audioContext) return;
  try {
    audioContext.resume?.().catch(() => {});
    const start = audioContext.currentTime + 0.05;
    const tone = toneOf(id);
    for (const offset of tone.repeatAt) {
      for (const { at, freq, dur, partials } of tone.notes) {
        for (const [ratio, amplitude] of partials) {
          const when = start + offset + at;
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = freq * ratio;
          gain.gain.setValueAtTime(0.0001, when);
          gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), when + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
          oscillator.connect(gain).connect(audioContext.destination);
          oscillator.start(when);
          oscillator.stop(when + dur + 0.01);
        }
      }
    }
  } catch {
    // Sin sonido.
  }
}
