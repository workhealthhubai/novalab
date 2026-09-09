import { Camera, RefreshCw, ScanLine, SwitchCamera } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { IdCardScanResult } from '@osgb/shared-types';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AppButton } from '@/design-system/app-button';

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sends a frame to the OCR endpoint and resolves with its result. */
  scanFrame: (file: File) => Promise<IdCardScanResult>;
  /** Called with the accepted result (auto mode: first valid MRZ; manual: the captured frame's result). */
  onScanned: (result: IdCardScanResult) => void;
}

type FacingMode = 'environment' | 'user';

/** Guide only helps framing; the API locates the card in the frame itself. */
const GUIDE = { width: 0.86, aspect: 85.6 / 54 };
const AUTO_INTERVAL_MS = 1500;
const AUTO_MAX_ATTEMPTS = 10;
const UNSUPPORTED =
  'Bu tarayıcıda kamera erişimi desteklenmiyor (HTTPS gerekir). Dosya seçerek devam edebilirsiniz.';

function describeError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verin veya dosya seçin.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Uygun bir kamera bulunamadı. Dosya seçerek devam edebilirsiniz.';
  if (name === 'NotReadableError') return 'Kamera başka bir uygulama tarafından kullanılıyor.';
  return 'Kamera açılamadı. Dosya seçerek devam edebilirsiniz.';
}

/** Grabs the current full-resolution frame as a JPEG file. */
function grabFrame(video: HTMLVideoElement): Promise<File | null> {
  if (video.videoWidth === 0) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) =>
        resolve(blob ? new File([blob], `kimlik-${Date.now()}.jpg`, { type: 'image/jpeg' }) : null),
      'image/jpeg',
      0.9,
    );
  });
}

/**
 * Live camera preview for scanning the back of an ID card. The whole frame is sent (the server
 * finds the card), so the card does not have to fit the guide exactly. In auto mode a frame is
 * scanned every 1.5 s until the MRZ check digits pass or the attempt limit is reached.
 */
export function CameraCaptureDialog({
  open,
  onOpenChange,
  scanFrame,
  onScanned,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [attempt, setAttempt] = useState(0);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [auto, setAuto] = useState(true);
  const [autoState, setAutoState] = useState<{
    tries: number;
    exhausted: boolean;
    lastScore?: string;
  }>({ tries: 0, exhausted: false });
  const [scanning, setScanning] = useState(false);
  const supported =
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices !== undefined &&
    'getUserMedia' in navigator.mediaDevices;
  const error = supported ? streamError : UNSUPPORTED;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open || !supported) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          void video.play().catch(() => undefined);
        }
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setStreamError(describeError(cause));
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facingMode, attempt, supported, stop]);

  // Auto mode: scan a frame periodically (never overlapping) until the MRZ is valid.
  useEffect(() => {
    if (!open || !ready || !auto || autoState.exhausted) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || busyRef.current) return;
      busyRef.current = true;
      void grabFrame(video)
        .then(async (file) => {
          if (!file) return;
          const result = await scanFrame(file);
          if (result.mrzValid) {
            onScanned(result);
            onOpenChange(false);
            return;
          }
          setAutoState((state) => {
            const tries = state.tries + 1;
            return {
              tries,
              exhausted: tries >= AUTO_MAX_ATTEMPTS,
              lastScore: `${result.fields.nationalId ? 'TC bulundu' : 'MRZ aranıyor'} · güven %${result.confidence}`,
            };
          });
        })
        .catch(() =>
          setAutoState((state) => ({
            ...state,
            tries: state.tries + 1,
            exhausted: state.tries + 1 >= AUTO_MAX_ATTEMPTS,
          })),
        )
        .finally(() => {
          busyRef.current = false;
        });
    }, AUTO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [open, ready, auto, autoState.exhausted, scanFrame, onScanned, onOpenChange]);

  const resetTransient = () => {
    setStreamError(null);
    setReady(false);
    setAutoState({ tries: 0, exhausted: false });
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetTransient();
    onOpenChange(next);
  };

  const switchCamera = () => {
    resetTransient();
    setFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'));
  };

  const retry = () => {
    resetTransient();
    setAttempt((n) => n + 1);
  };

  const captureNow = async () => {
    const video = videoRef.current;
    if (!video || busyRef.current) return;
    busyRef.current = true;
    setScanning(true);
    try {
      const file = await grabFrame(video);
      if (!file) return;
      const result = await scanFrame(file);
      onScanned(result);
      onOpenChange(false);
    } catch {
      setAutoState((state) => ({ ...state, lastScore: 'Tarama başarısız, tekrar deneyin' }));
    } finally {
      busyRef.current = false;
      setScanning(false);
    }
  };

  const statusText = error
    ? null
    : !ready
      ? 'Kamera açılıyor…'
      : auto
        ? autoState.exhausted
          ? 'Otomatik tarama sınırına ulaşıldı; kartı yaklaştırıp "Çek ve tara" ile deneyin.'
          : `Otomatik tarama: deneme ${autoState.tries}/${AUTO_MAX_ATTEMPTS}${autoState.lastScore ? ` · ${autoState.lastScore}` : ''}`
        : 'Hazır olunca "Çek ve tara" düğmesine basın.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[640px] gap-4" showCloseButton>
        <DialogHeader>
          <DialogTitle>Kimlik kartını tara</DialogTitle>
          <DialogDescription>
            Kartın arka yüzünü kameraya gösterin. Çerçeveye tam oturması gerekmez; kart görüntüde
            otomatik bulunur.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-900">
          <video
            ref={videoRef}
            className="size-full object-cover"
            autoPlay
            playsInline
            muted
            aria-label="Kamera önizlemesi"
          />
          {ready ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div
                className="relative rounded-md border-2 border-dashed border-white/70"
                style={{ width: `${GUIDE.width * 100}%`, aspectRatio: String(GUIDE.aspect) }}
              />
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white"
            >
              {error}
            </div>
          ) : null}
          {statusText ? (
            <div
              role="status"
              className="absolute right-0 bottom-0 left-0 bg-slate-900/70 px-3 py-2 text-center text-xs text-white"
            >
              {(scanning || (auto && !autoState.exhausted && ready)) && !error ? (
                <ScanLine className="mr-1 inline size-3.5 animate-pulse" aria-hidden />
              ) : null}
              {statusText}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="camera-auto"
              checked={auto}
              onCheckedChange={(value) => setAuto(value === true)}
              disabled={!supported}
            />
            <Label htmlFor="camera-auto" className="cursor-pointer text-sm font-normal">
              Otomatik tara
            </Label>
            <AppButton variant="ghost" size="sm" onClick={switchCamera} disabled={!supported}>
              <SwitchCamera />
              Kamerayı değiştir
            </AppButton>
          </div>
          <div className="flex gap-2">
            {streamError ? (
              <AppButton variant="secondary" size="sm" onClick={retry}>
                <RefreshCw />
                Tekrar dene
              </AppButton>
            ) : null}
            <AppButton onClick={() => void captureNow()} disabled={!ready} loading={scanning}>
              <Camera />
              Çek ve tara
            </AppButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
