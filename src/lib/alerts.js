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
  try {
    chime?.pause();
  } catch {
    // Nada que parar.
  }
}

// --- Sonido -------------------------------------------------------------
//
// El timbre es un `Audio` de verdad (un WAV generado aquí, sin descargar
// nada) con `volume = 1.0`: a diferencia de Web Audio, en iPhone un `<audio>`
// suena aunque el interruptor de silencio esté puesto, y no se pierde con el
// ruido de la calle. Si no puede sonar, Web Audio como plan B.

const SAMPLE_RATE = 22_050;
// Tres tonos ascendentes (como un timbre de autobús), dos veces seguidas.
const TONES = [880, 1109, 1319];
const TONE_S = 0.25;
const STEP_S = 0.28;
const REPEAT_AT_S = [0, 1.1];

let chime = null;
let audioContext = null;

/** WAV PCM de 16 bits del timbre, como URL de un `Blob`. */
function chimeWavUrl() {
  const length = Math.ceil(SAMPLE_RATE * (REPEAT_AT_S.at(-1) + STEP_S * 2 + TONE_S + 0.05));
  const samples = new Float32Array(length);
  for (const offset of REPEAT_AT_S) {
    TONES.forEach((frequency, step) => {
      const begin = Math.floor((offset + step * STEP_S) * SAMPLE_RATE);
      const count = Math.floor(TONE_S * SAMPLE_RATE);
      for (let i = 0; i < count; i++) {
        const t = i / SAMPLE_RATE;
        // Ataque de 10 ms y caída exponencial: suena limpio, sin chasquidos.
        const envelope = Math.min(1, t / 0.01) * Math.exp(-t * 9);
        samples[begin + i] += 0.9 * envelope * Math.sin(2 * Math.PI * frequency * t);
      }
    });
  }
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

/**
 * Prepara el sonido del aviso. Llamar dentro del toque del usuario: Safari
 * solo deja sonar audio que se haya empezado en un gesto (aquí se reproduce
 * un instante en silencio y se para).
 */
export function unlockSound() {
  try {
    if (!chime && typeof Audio !== 'undefined') {
      chime = new Audio(chimeWavUrl());
      chime.preload = 'auto';
    }
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
    chime = null;
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
  if (!chime) {
    playChimeWebAudio();
    return;
  }
  try {
    chime.muted = false;
    chime.volume = 1.0;
    chime.currentTime = 0;
    chime.play().catch(playChimeWebAudio);
  } catch {
    playChimeWebAudio();
  }
}

function playChimeWebAudio() {
  if (!audioContext) return;
  try {
    audioContext.resume?.().catch(() => {});
    const start = audioContext.currentTime + 0.05;
    TONES.forEach((frequency, step) => {
      const at = start + step * STEP_S;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      // Al máximo sin saturar (los tonos no se solapan).
      gain.gain.exponentialRampToValueAtTime(1.0, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + TONE_S);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + TONE_S + 0.01);
    });
  } catch {
    // Sin sonido.
  }
}
