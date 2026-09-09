import { Camera, CircleAlert, CircleCheck, ImageUp, ScanLine } from 'lucide-react';
import { type ChangeEvent, useCallback, useRef, useState } from 'react';
import type { IdCardScanFields, IdCardScanResult } from '@osgb/shared-types';
import { AppButton } from '@/design-system/app-button';
import { toApiError } from '@/services/api-client';
import { CameraCaptureDialog } from './camera-capture-dialog';
import { warmUpClientScanner } from './ocr/client-scanner';
import { useScanIdCard } from './use-patients';

interface IdCardScannerProps {
  /** Called with the extracted fields when the user accepts the scan. */
  onApply: (fields: IdCardScanFields) => void;
}

/** MRZ glyphs need roughly 30 px of width each; below this OCR becomes unreliable. */
const MIN_IMAGE_WIDTH = 1000;

const FIELD_LABELS: Array<{ key: keyof IdCardScanFields; label: string }> = [
  { key: 'nationalId', label: 'TC Kimlik No' },
  { key: 'lastName', label: 'Soyadı' },
  { key: 'firstName', label: 'Adı' },
  { key: 'birthDate', label: 'Doğum tarihi' },
  { key: 'gender', label: 'Cinsiyet' },
  { key: 'documentNumber', label: 'Belge no (→ Sicil / Belge No)' },
  { key: 'expiryDate', label: 'Geçerlilik' },
];

function formatValue(key: keyof IdCardScanFields, value: string | undefined): string {
  if (!value) return '—';
  if (key === 'gender') return value === 'MALE' ? 'Erkek' : 'Kadın';
  return value;
}

/**
 * Live camera capture (CameraCaptureDialog) or a photo file of the ID card's back side (MRZ).
 * The API runs OCR and returns fields with checksum results; nothing is written until the user
 * clicks "Alanlara aktar".
 * TODO: hardware ID-card readers (PC/SC) can plug into the same onApply contract.
 */
export function IdCardScanner({ onApply }: IdCardScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sizeHint, setSizeHint] = useState<string | null>(null);
  const [cameraResult, setCameraResult] = useState<IdCardScanResult | null>(null);
  const scan = useScanIdCard();
  // Camera frames: the first few attempts stay in the browser; from the third on the API may help.
  const frameAttempts = useRef(0);
  const scanFrame = useCallback(
    (file: File) => {
      frameAttempts.current += 1;
      return scan.mutateAsync({ file, allowServer: frameAttempts.current >= 3 });
    },
    [scan],
  );
  const openCamera = () => {
    frameAttempts.current = 0;
    warmUpClientScanner();
    setCameraOpen(true);
  };

  /** Sends the image and warns when it is too small for the MRZ characters to be legible. */
  const submit = (file: File) => {
    setSizeHint(null);
    scan.mutate({ file });
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then((bitmap) => {
          if (bitmap.width < MIN_IMAGE_WIDTH)
            setSizeHint(
              `Görüntü genişliği ${bitmap.width}px; en az ${MIN_IMAGE_WIDTH}px önerilir. Kartı daha yakından ve net çekin.`,
            );
          bitmap.close();
        })
        .catch(() => undefined);
    }
  };
  const result: IdCardScanResult | undefined = cameraResult ?? scan.data;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCameraResult(null);
    if (file) submit(file);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFile}
          aria-label="Kimlik kartı fotoğrafı seç"
        />
        <AppButton variant="secondary" onClick={openCamera} loading={scan.isPending}>
          <Camera />
          Kameradan Tara
        </AppButton>
        <AppButton
          variant="ghost"
          onClick={() => inputRef.current?.click()}
          disabled={scan.isPending}
        >
          <ImageUp />
          Fotoğraf Seç
        </AppButton>
        <span className="text-xs text-muted-foreground">
          Kimlik kartının arka yüzünü (MRZ satırları) net biçimde çekin.
        </span>
      </div>
      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        scanFrame={scanFrame}
        onScanned={(scanned) => setCameraResult(scanned)}
      />

      {sizeHint ? (
        <p role="status" className="text-xs text-warning">
          {sizeHint}
        </p>
      ) : null}

      {scan.error ? (
        <p role="alert" className="text-sm text-destructive">
          {toApiError(scan.error).message}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            {result.mrzValid ? (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CircleCheck className="size-4" /> MRZ okundu, kontrol basamakları doğru
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-warning">
                <CircleAlert className="size-4" /> Okuma eksik veya hatalı — alanları kontrol edin
              </span>
            )}
            <span className="text-muted-foreground">
              Güven: %{result.confidence}
              {result.engine === 'client'
                ? ' · cihazda tarandı'
                : result.engine === 'server'
                  ? ' · sunucuda tarandı'
                  : ''}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {FIELD_LABELS.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-medium">{formatValue(key, result.fields[key])}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Barkod:{' '}
            {result.barcode ? (
              <>
                <span className="font-mono text-foreground">{result.barcode.text}</span> (
                {result.barcode.format})
                {result.checks.documentNumberBarcodeMatch === true
                  ? ' · MRZ belge numarasıyla eşleşiyor'
                  : result.checks.documentNumberBarcodeMatch === false
                    ? ' · MRZ ile eşleşmiyor!'
                    : ''}
              </>
            ) : (
              <span>okunamadı</span>
            )}
          </p>
          {result.warnings.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {result.rawLines.length > 0 ? (
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Okunan MRZ satırları</summary>
              <pre className="mt-1 overflow-x-auto rounded-sm bg-card p-2 font-mono text-[11px] text-foreground">
                {result.rawLines.join('\n')}
              </pre>
            </details>
          ) : null}
          <div className="mt-3 flex gap-2">
            <AppButton
              size="sm"
              onClick={() => onApply(result.fields)}
              disabled={!result.fields.nationalId && !result.fields.lastName}
            >
              <ScanLine />
              Alanlara aktar
            </AppButton>
            <AppButton
              size="sm"
              variant="ghost"
              onClick={() => {
                setCameraResult(null);
                scan.reset();
              }}
            >
              Kapat
            </AppButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
