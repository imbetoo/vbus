import { Camera, CircleAlert, Flashlight, FlashlightOff, Keyboard, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { findStop, loadStopsList } from '../../data/stops';
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog';
import { createQrDecoder } from '../../lib/qrDecoder';
import { parseStopQr } from '../../lib/qrStop';
import IconButton from '../ui/IconButton';
import { PRESSABLE } from '../ui/pressable';

const EXIT_MS = 300;
// Fotogramas analizados por segundo: de sobra para leer al instante sin
// calentar el móvil (el vídeo sigue a 30–60 fps, lo pinta la GPU).
const SCAN_INTERVAL_MS = 120;
// Tras leer una parada, el visor se pone verde un momento antes de cerrar.
const FOUND_MS = 450;

// Mensaje para cada estado que no es "escaneando".
const MESSAGES = {
  unsupported: 'Este navegador no puede usar la cámara. Haz una foto del QR o escribe el número de la parada.',
  denied: 'Sin permiso para usar la cámara. Actívalo en los ajustes del navegador, o haz una foto del QR.',
  nocamera: 'No se encuentra ninguna cámara. Haz una foto del QR o escribe el número de la parada.',
  error: 'No se pudo abrir la cámara. Inténtalo de nuevo o haz una foto del QR.',
  invalid: 'Este QR no es de una parada de Vitrasa.',
  nophoto: 'No encuentro ningún QR en la foto. Prueba a acercarte más.',
};

function cameraErrorStatus(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'denied';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'nocamera';
  return 'error';
}

/**
 * Escáner del QR de las marquesinas, a pantalla completa (`<dialog>` modal,
 * entra y sale con fundido). Usa la cámara trasera (`getUserMedia`) y lee el
 * QR con el detector del sistema o jsQR en un worker (`createQrDecoder`); del
 * texto saca el número de parada (`parseStopQr`) y devuelve la parada
 * (`onScan(stop)`, con los datos de `stopsList`).
 *
 * Plan B en cualquier móvil: hacer una foto del QR. Con linterna si la cámara
 * la tiene (Android). La cámara solo está encendida mientras el escáner está
 * abierto.
 */
export default function ScannerSheet({ open, onClose, onScan }) {
  const ref = useRef(null);
  const titleId = useId();
  const { mounted, dialogProps } = useAnimatedDialog({ ref, open, onClose, exitMs: EXIT_MS });

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      {...dialogProps}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-black p-0 text-white opacity-0 transform-gpu transition-opacity duration-300 ease-spring will-change-[opacity] backdrop:bg-black data-[shown]:opacity-100 motion-reduce:transition-none"
    >
      {mounted && <Scanner titleId={titleId} onClose={onClose} onScan={onScan} />}
    </dialog>
  );
}

function Scanner({ titleId, onClose, onScan }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const trackRef = useRef(null);
  const decoderRef = useRef(null);
  // Leído: se ignoran los fotogramas siguientes mientras se cierra.
  const doneRef = useRef(false);
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });
  const [status, setStatus] = useState('starting');
  const [notice, setNotice] = useState(null);
  const [torch, setTorch] = useState({ available: false, on: false });

  // Texto de un QR → parada, o aviso si no es de Vitrasa.
  const handleText = async (text, failure = 'invalid') => {
    if (doneRef.current) return;
    const stopId = parseStopQr(text);
    if (!stopId) {
      setNotice(text ? 'invalid' : failure);
      return;
    }
    doneRef.current = true;
    await loadStopsList().catch(() => {});
    setStatus('found');
    navigator.vibrate?.(30);
    setTimeout(() => onScanRef.current(findStop(stopId)), FOUND_MS);
  };
  const handleTextRef = useRef(handleText);
  useEffect(() => {
    handleTextRef.current = handleText;
  });

  // Cámara + bucle de lectura; todo se apaga al cerrar.
  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let frame = 0;
    let busy = false;
    let last = 0;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      decoderRef.current?.close();
      decoderRef.current = null;
    };

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (error) {
        if (!cancelled) setStatus(cameraErrorStatus(error));
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const decoder = await createQrDecoder();
      if (cancelled) {
        decoder.close();
        return;
      }
      decoderRef.current = decoder;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      if (track?.getCapabilities?.().torch) setTorch({ available: true, on: false });
      setStatus('scanning');

      const tick = (now) => {
        if (cancelled) return;
        frame = requestAnimationFrame(tick);
        if (busy || doneRef.current || now - last < SCAN_INTERVAL_MS || video.readyState < 2) return;
        busy = true;
        last = now;
        decoder
          .decode(video)
          .then((text) => {
            busy = false;
            if (text && !cancelled) handleTextRef.current(text);
          })
          .catch(() => {
            busy = false;
          });
      };
      frame = requestAnimationFrame(tick);
    };

    start();
    return stop;
  }, []);

  // El aviso de "no es de Vitrasa" se borra solo.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const toggleTorch = async () => {
    const on = !torch.on;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: on }] });
      setTorch({ available: true, on });
    } catch {
      setTorch({ available: false, on: false });
    }
  };

  // Plan B: una foto del QR (cámara del sistema o galería).
  const readPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    let decoder = decoderRef.current;
    const temporary = !decoder;
    try {
      decoder ??= await createQrDecoder();
      const image = await createImageBitmap(file);
      const text = await decoder.decode(image, { maxSide: 1600 });
      image.close?.();
      await handleText(text, 'nophoto');
    } catch {
      setNotice('nophoto');
    } finally {
      if (temporary) decoder?.close();
    }
  };

  const scanning = status === 'scanning' || status === 'starting';
  const found = status === 'found';
  const message = notice ? MESSAGES[notice] : MESSAGES[status];

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          status === 'scanning' || found ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Visor: cuadrado con esquinas redondeadas; el resto se oscurece. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div
          className={`aspect-square w-[min(72vw,18rem)] rounded-[32px] border-2 shadow-[0_0_0_100vmax_rgb(0_0_0/0.55)] transition-[transform,border-color] duration-300 ease-spring motion-reduce:transition-none ${
            found ? 'scale-105 border-emerald-400' : 'border-white/80'
          }`}
        />
      </div>

      {/* Cabecera */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]">
        <div>
          <h2 id={titleId} className="text-2xl font-bold tracking-[-0.015em]">
            Escanear parada
          </h2>
          <p className="text-base font-medium text-white/80">Apunta al QR de la marquesina</p>
        </div>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </div>

      {/* Pie: estado y acciones */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
        <div aria-live="polite" className="min-h-[3.5rem] w-full max-w-sm">
          {found && (
            <p className="animate-fade-in rounded-2xl bg-emerald-500/90 px-4 py-3 text-center text-base font-semibold motion-reduce:animate-none">
              Parada encontrada
            </p>
          )}
          {!found && message && (
            <p
              key={notice ?? status}
              className="flex animate-fade-in items-start gap-2 rounded-2xl border border-white/10 bg-graphite/90 px-4 py-3 text-base font-medium motion-reduce:animate-none"
            >
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" strokeWidth={2.5} aria-hidden="true" />
              {message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {torch.available && (
            <IconButton
              label={torch.on ? 'Apagar linterna' : 'Encender linterna'}
              aria-pressed={torch.on}
              onClick={toggleTorch}
              className={torch.on ? 'bg-white text-black' : ''}
            >
              {torch.on ? (
                <Flashlight className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <FlashlightOff className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              )}
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/15 px-5 text-base font-semibold text-white active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
          >
            <Camera className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Hacer una foto
          </button>
          {!scanning && !found && (
            <button
              type="button"
              onClick={onClose}
              className={`flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/15 px-5 text-base font-semibold text-white active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${PRESSABLE}`}
            >
              <Keyboard className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              Escribir
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={readPhoto}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
