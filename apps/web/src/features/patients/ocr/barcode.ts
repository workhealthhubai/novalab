import type { IdCardBarcode } from '@osgb/shared-types';

/** Barcode decoding in the browser: native BarcodeDetector when present, otherwise zxing (self-hosted WASM). */

interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

const NATIVE_FORMATS = ['code_128', 'code_39', 'pdf417', 'qr_code', 'data_matrix'];
const NATIVE_LABELS: Record<string, string> = {
  code_128: 'Code128',
  code_39: 'Code39',
  pdf417: 'PDF417',
  qr_code: 'QRCode',
  data_matrix: 'DataMatrix',
};

let native: BarcodeDetectorLike | null | undefined;

function nativeDetector(): BarcodeDetectorLike | null {
  if (native !== undefined) return native;
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  try {
    native = ctor ? new ctor({ formats: NATIVE_FORMATS }) : null;
  } catch {
    native = null;
  }
  return native;
}

/** Kept as a single object: zxing re-instantiates its module whenever the overrides change identity. */
const ZXING_OVERRIDES = {
  locateFile: (path: string, prefix: string) =>
    path.endsWith('.wasm') ? '/ocr/zxing_reader.wasm' : prefix + path,
};

async function readWithZxing(canvas: HTMLCanvasElement): Promise<IdCardBarcode | null> {
  const zxing = await import('zxing-wasm/reader');
  zxing.prepareZXingModule({ overrides: ZXING_OVERRIDES });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const results = await zxing.readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), {
    formats: ['Code128', 'Code39', 'PDF417', 'QRCode', 'DataMatrix'],
    tryHarder: true,
    tryRotate: true,
    tryDownscale: true,
    maxNumberOfSymbols: 3,
  });
  const hit = results.find((r) => r.isValid && r.text.trim().length > 0);
  return hit ? { format: hit.format, text: hit.text.trim() } : null;
}

/** Decodes the first barcode in the canvas; null when none is found or decoding is unavailable. */
export async function readBarcode(canvas: HTMLCanvasElement): Promise<IdCardBarcode | null> {
  try {
    const detector = nativeDetector();
    if (detector) {
      const found = await detector.detect(canvas);
      const hit = found.find((b) => b.rawValue.trim().length > 0);
      if (hit)
        return { format: NATIVE_LABELS[hit.format] ?? hit.format, text: hit.rawValue.trim() };
    }
    return await readWithZxing(canvas);
  } catch {
    return null;
  }
}
