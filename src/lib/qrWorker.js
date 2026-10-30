// Decodificador de QR en segundo plano (jsQR) para los navegadores sin
// `BarcodeDetector` (Safari): recibe los píxeles de un fotograma y devuelve el
// texto del QR o `null`, sin ocupar el hilo de la interfaz.
import jsQR from 'jsqr';

self.onmessage = ({ data: { id, width, height, pixels } }) => {
  let text = null;
  try {
    // Los QR de las marquesinas son oscuros sobre claro: no hace falta probar
    // la imagen invertida (la mitad de trabajo por fotograma).
    text = jsQR(new Uint8ClampedArray(pixels), width, height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  } catch {
    text = null;
  }
  self.postMessage({ id, text });
};
