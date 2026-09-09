import type Tesseract from 'tesseract.js';
import { type IdCardScanResult, mergeBarcode } from '@osgb/shared-types';
import { readBarcode } from './barcode';
import { crop, loadImage, locateCard, normalizeGray } from './image-ops';
import { recognizeVariants, type Variant } from './mrz-pipeline';

/**
 * In-browser ID card scanner: tesseract.js (WASM) with the same OCR-B/MRZ model as the API,
 * self-hosted under /ocr. The photo never leaves the device. The worker is created lazily on
 * the first scan and reused.
 */

const OCR_BASE = '/ocr';
const MRZ_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
/** Fewer variants than the API: the browser is slower and a phone frame is already high resolution. */
const BAND_WIDTH = 2000;
const FULL_WIDTH = 1600;

let workerPromise: Promise<Tesseract.Worker> | null = null;

/** True when the browser has what the scanner needs (Web Workers, WebAssembly, canvas bitmaps). */
export function isClientScanSupported(): boolean {
  return (
    typeof Worker !== 'undefined' &&
    typeof WebAssembly !== 'undefined' &&
    typeof createImageBitmap === 'function' &&
    typeof document !== 'undefined'
  );
}

async function getWorker(): Promise<Tesseract.Worker> {
  workerPromise ??= (async () => {
    const { createWorker, PSM } = await import('tesseract.js');
    const worker = await createWorker('mrz', undefined, {
      workerPath: `${OCR_BASE}/worker.min.js`,
      corePath: OCR_BASE,
      langPath: OCR_BASE,
      gzip: false,
      workerBlobURL: false,
    });
    await worker.setParameters({
      tessedit_char_whitelist: MRZ_WHITELIST,
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    return worker;
  })().catch((error: unknown) => {
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

/** Downloads the OCR runtime ahead of the first scan (call when the camera dialog opens). */
export function warmUpClientScanner(): void {
  if (isClientScanSupported()) void getWorker().catch(() => undefined);
}

function prepareVariants(frame: HTMLCanvasElement): Array<Variant<HTMLCanvasElement>> {
  const sources: Array<{ name: string; image: HTMLCanvasElement }> = [];
  const card = locateCard(frame);
  if (card && (card.width < frame.width * 0.9 || card.height < frame.height * 0.9)) {
    sources.push({ name: 'card', image: crop(frame, card) });
  }
  sources.push({ name: 'frame', image: frame });

  const variants: Array<Variant<HTMLCanvasElement>> = [];
  for (const source of sources) {
    const top = Math.round(source.image.height * 0.55);
    const band = { left: 0, top, width: source.image.width, height: source.image.height - top };
    variants.push({
      name: `${source.name}:band-normalize`,
      image: normalizeGray(crop(source.image, band, Math.max(source.image.width, BAND_WIDTH))),
    });
    variants.push({
      name: `${source.name}:full-normalize`,
      image: normalizeGray(
        crop(
          source.image,
          { left: 0, top: 0, width: source.image.width, height: source.image.height },
          Math.max(source.image.width, FULL_WIDTH),
        ),
      ),
    });
  }
  return variants;
}

/** Scans a photo entirely in the browser. Rejects when the OCR runtime cannot be loaded. */
export async function scanIdCardOnClient(file: Blob): Promise<IdCardScanResult> {
  const [worker, frame] = await Promise.all([getWorker(), loadImage(file)]);
  const barcodePromise = readBarcode(frame);
  const { result } = await recognizeVariants(prepareVariants(frame), async (image) => {
    const { data } = await worker.recognize(image);
    return { text: data.text, confidence: data.confidence };
  });
  const merged = mergeBarcode(result, await barcodePromise);
  merged.engine = 'client';
  return merged;
}
