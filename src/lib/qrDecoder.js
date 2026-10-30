/**
 * Lector de QR para el escáner. Con `BarcodeDetector` (Chrome Android) usa el
 * del sistema; si no (Safari/iOS), jsQR en un Web Worker que solo se descarga
 * al abrir el escáner. El fotograma se reduce antes (`maxSide`): un QR que
 * llena el visor se lee igual y cuesta una fracción.
 *
 * `decode(source, { maxSide })` acepta un `<video>` o una imagen
 * (`ImageBitmap`) y resuelve el texto del QR o `null`. `close()` libera el
 * worker.
 */
export async function createQrDecoder() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return {
          decode: async (source) => (await detector.detect(source))[0]?.rawValue ?? null,
          close() {},
        };
      }
    } catch {
      // Detector del sistema no disponible: jsQR.
    }
  }

  const worker = new Worker(new URL('./qrWorker.js', import.meta.url), { type: 'module' });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const pending = new Map();
  let nextId = 0;
  const settleAll = () => {
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
  };
  worker.onmessage = ({ data }) => {
    pending.get(data.id)?.(data.text);
    pending.delete(data.id);
  };
  worker.onerror = settleAll;

  return {
    decode(source, { maxSide = 800 } = {}) {
      const width = source.videoWidth || source.width;
      const height = source.videoHeight || source.height;
      if (!width || !height) return Promise.resolve(null);
      const scale = Math.min(1, maxSide / Math.max(width, height));
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const id = nextId++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        // El búfer se transfiere (no se copia) al worker.
        worker.postMessage({ id, width: image.width, height: image.height, pixels: image.data.buffer }, [
          image.data.buffer,
        ]);
      });
    },
    close() {
      worker.terminate();
      settleAll();
    },
  };
}
