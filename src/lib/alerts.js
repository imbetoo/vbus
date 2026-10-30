/**
 * Cómo avisa el modo viaje: notificación del sistema, vibración y un sonido.
 * Cada uno se usa si el navegador lo permite; ninguno lanza errores.
 *
 * - Notificaciones: Chrome Android y escritorio; en iPhone, solo con vBus
 *   añadida a la pantalla de inicio (iOS 16.4+). Se muestran desde el
 *   service worker (en Android, `new Notification()` no está permitido) y
 *   tocarla vuelve a la app (`public/sw-notifications.js`).
 * - Vibración: solo Android (iOS no tiene `navigator.vibrate`).
 * - Sonido: Web Audio, desbloqueado en el toque de "Avisarme" (Safari no deja
 *   sonar audio que no empiece con un gesto).
 */

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

/** Vibra con un patrón (ms). En iOS no hace nada. */
export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Sin vibración.
  }
}

let audioContext = null;

/**
 * Prepara el sonido del aviso. Llamar dentro del toque del usuario: Safari
 * solo deja que un `AudioContext` suene si se crea o reanuda en un gesto.
 */
export function unlockSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext ??= new AudioContext();
    audioContext.resume?.().catch(() => {});
    // Un instante de silencio: termina de desbloquearlo en iOS.
    const buffer = audioContext.createBuffer(1, 1, 22_050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch {
    audioContext = null;
  }
}

/** Tres tonos ascendentes, cortos y claros (como un timbre de autobús). */
export function playChime() {
  if (!audioContext) return;
  try {
    audioContext.resume?.().catch(() => {});
    const start = audioContext.currentTime + 0.05;
    [880, 1109, 1319].forEach((frequency, step) => {
      const at = start + step * 0.28;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.26);
    });
  } catch {
    // Sin sonido.
  }
}
