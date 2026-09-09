import { Camera, ImageUp, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppButton } from '@/design-system/app-button';
import { cn, initials } from '@/lib/utils';
import { usePatientPhoto } from './use-patients';

/** Pending change to a patient's portrait, applied after the record itself is saved. */
export type PhotoChange = { file: Blob } | 'remove' | null;

/** Portrait frame: 3:4, at most this many pixels tall (the API downsizes further). */
const PORTRAIT = { aspect: 3 / 4, maxHeight: 1200 };
const UNSUPPORTED = 'Bu tarayıcıda kamera erişimi desteklenmiyor (HTTPS gerekir).';

const supported =
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices !== undefined &&
  'getUserMedia' in navigator.mediaDevices;

/** Object URL for a blob, revoked when the blob changes or the component unmounts. */
function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}

/** Crops the centred 3:4 region of the video frame and encodes it as JPEG. */
function capturePortrait(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.videoWidth === 0) return Promise.resolve(null);
  let h = video.videoHeight;
  let w = h * PORTRAIT.aspect;
  if (w > video.videoWidth) {
    w = video.videoWidth;
    h = w / PORTRAIT.aspect;
  }
  const scale = Math.min(1, PORTRAIT.maxHeight / h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas
    .getContext('2d')
    ?.drawImage(
      video,
      (video.videoWidth - w) / 2,
      (video.videoHeight - h) / 2,
      w,
      h,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

function describeError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verin veya dosya seçin.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Uygun bir kamera bulunamadı.';
  if (name === 'NotReadableError') return 'Kamera başka bir uygulama tarafından kullanılıyor.';
  return 'Kamera açılamadı.';
}

interface PhotoCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (photo: Blob) => void;
}

/** Front-camera portrait capture with a 3:4 guide; the user reviews the shot before accepting it. */
export function PhotoCaptureDialog({ open, onOpenChange, onCapture }: PhotoCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [shot, setShot] = useState<Blob | null>(null);
  const shotUrl = useObjectUrl(shot);
  const error = supported ? streamError : UNSUPPORTED;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open || shot || !supported) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          void video.play().then(() => setReady(true));
        };
      })
      .catch((cause: unknown) => {
        if (!cancelled) setStreamError(describeError(cause));
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, shot, facingMode, attempt, stop]);

  /** State reset happens in handlers (not in the effect) so React never re-renders mid-effect. */
  const restart = () => {
    setReady(false);
    setStreamError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stop();
      setShot(null);
    }
    restart();
    onOpenChange(next);
  };

  const take = async () => {
    const video = videoRef.current;
    if (!video) return;
    const blob = await capturePortrait(video);
    if (blob) {
      stop();
      setShot(blob);
    }
  };

  const accept = () => {
    if (!shot) return;
    onCapture(shot);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[520px] gap-4" showCloseButton>
        <DialogHeader>
          <DialogTitle>Hasta fotoğrafı çek</DialogTitle>
          <DialogDescription>
            Yüz çerçevenin içinde ve iyi aydınlatılmış olsun. Çekimden sonra kontrol edip
            kullanabilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-lg bg-slate-900">
          {shotUrl ? (
            <img src={shotUrl} alt="Çekilen fotoğraf" className="size-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                className={cn('size-full object-cover', facingMode === 'user' && '-scale-x-100')}
                autoPlay
                playsInline
                muted
                aria-label="Kamera önizlemesi"
              />
              {ready ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-4 rounded-[45%] border-2 border-dashed border-white/70"
                />
              ) : null}
              {error ? (
                <div
                  role="alert"
                  className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white"
                >
                  {error}
                </div>
              ) : !ready ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  Kamera açılıyor…
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {shot ? (
            <>
              <AppButton
                variant="secondary"
                onClick={() => {
                  restart();
                  setShot(null);
                }}
              >
                <RefreshCw />
                Tekrar çek
              </AppButton>
              <AppButton onClick={accept}>Bu fotoğrafı kullan</AppButton>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <AppButton
                  variant="ghost"
                  size="sm"
                  disabled={!supported}
                  onClick={() =>
                    setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'))
                  }
                >
                  Kamerayı değiştir
                </AppButton>
                {streamError && supported ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      restart();
                      setAttempt((n) => n + 1);
                    }}
                  >
                    <RefreshCw />
                    Tekrar dene
                  </AppButton>
                ) : null}
              </div>
              <AppButton onClick={() => void take()} disabled={!ready}>
                <Camera />
                Çek
              </AppButton>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PatientAvatarProps {
  patientId?: string;
  photoUpdatedAt?: string | null;
  name: string;
  /** Overrides the stored photo (form preview of a pending capture). */
  previewBlob?: Blob | null;
  className?: string;
}

/** Stored portrait (fetched with the session) or initials when the patient has none. */
export function PatientAvatar({
  patientId,
  photoUpdatedAt,
  name,
  previewBlob,
  className,
}: PatientAvatarProps) {
  const stored = usePatientPhoto(previewBlob ? undefined : patientId, photoUpdatedAt);
  const url = useObjectUrl(previewBlob ?? stored.data);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-primary-dark',
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`${name} fotoğrafı`} className="size-full object-cover" />
      ) : (
        <span
          className="flex flex-col items-center gap-1 text-sm font-semibold"
          aria-label="Fotoğraf yok"
        >
          <UserRound className="size-6 opacity-60" aria-hidden />
          {initials(name)}
        </span>
      )}
    </div>
  );
}

interface PatientPhotoFieldProps {
  patientId?: string;
  photoUpdatedAt?: string | null;
  name: string;
  value: PhotoChange;
  onChange: (change: PhotoChange) => void;
}

/** Form control: shows the current/pending portrait with capture, file and remove actions. */
export function PatientPhotoField({
  patientId,
  photoUpdatedAt,
  name,
  value,
  onChange,
}: PatientPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const pending = value && value !== 'remove' ? value.file : null;
  const hasStored = Boolean(photoUpdatedAt) && value !== 'remove';
  const showRemove = pending !== null || hasStored;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onChange({ file });
    event.target.value = '';
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <PatientAvatar
        patientId={value === 'remove' ? undefined : patientId}
        photoUpdatedAt={value === 'remove' ? null : photoUpdatedAt}
        name={name}
        previewBlob={pending}
        className="h-32 w-24"
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={handleFile}
            aria-label="Hasta fotoğrafı seç"
          />
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCameraOpen(true)}
          >
            <Camera />
            Fotoğraf Çek
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp />
            Dosya Seç
          </AppButton>
          {showRemove ? (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(hasStored ? 'remove' : null)}
            >
              <Trash2 />
              Kaldır
            </AppButton>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {pending
            ? 'Yeni fotoğraf kaydedince yüklenir.'
            : value === 'remove'
              ? 'Mevcut fotoğraf kaydedince silinir.'
              : 'İsteğe bağlı; 3:4 portre olarak saklanır (en fazla 800 px).'}
        </p>
      </div>
      <PhotoCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(file) => onChange({ file })}
      />
    </div>
  );
}
