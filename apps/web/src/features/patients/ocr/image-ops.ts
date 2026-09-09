import { CARD_ANALYSIS_WIDTH, type CardRegion, locateCardInGray } from '@osgb/shared-types';

/** Canvas helpers for the in-browser ID card scanner (the browser-side twin of sharp on the API). */

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return ctx;
}

/** Decodes a photo into a canvas, applying EXIF orientation so width/height match what the user saw. */
export async function loadImage(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    context(canvas).drawImage(bitmap, 0, 0);
    return canvas;
  } finally {
    bitmap.close();
  }
}

/** Crops a region and scales it to `width`, keeping the aspect ratio. */
export function crop(
  source: HTMLCanvasElement,
  region: CardRegion,
  width = region.width,
): HTMLCanvasElement {
  const scale = width / region.width;
  const canvas = createCanvas(width, region.height * scale);
  context(canvas).drawImage(
    source,
    region.left,
    region.top,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

/** One byte per pixel luminance copy of the canvas at the given width (row-major). */
export function toGray(
  source: HTMLCanvasElement,
  width: number,
): { gray: Uint8Array; width: number; height: number } {
  const scaled = crop(
    source,
    { left: 0, top: 0, width: source.width, height: source.height },
    width,
  );
  const { data } = context(scaled).getImageData(0, 0, scaled.width, scaled.height);
  const gray = new Uint8Array(scaled.width * scaled.height);
  for (let i = 0, j = 0; j < gray.length; i += 4, j += 1) {
    gray[j] = (data[i]! * 299 + data[i + 1]! * 587 + data[i + 2]! * 114) / 1000;
  }
  return { gray, width: scaled.width, height: scaled.height };
}

/** Locates the card in the frame (shared analysis); null when nothing card-like stands out. */
export function locateCard(source: HTMLCanvasElement): CardRegion | null {
  const { gray, width, height } = toGray(source, Math.min(CARD_ANALYSIS_WIDTH, source.width));
  return locateCardInGray(gray, width, height, source.width / width);
}

/**
 * Grayscale + contrast stretch (the equivalent of sharp's `normalize`): the 1st and 99th
 * luminance percentiles are mapped to black and white, which lifts faded MRZ print.
 */
export function normalizeGray(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = context(canvas);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  const histogram = new Uint32Array(256);
  const lum = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const l = (data[i]! * 299 + data[i + 1]! * 587 + data[i + 2]! * 114) / 1000;
    lum[j] = l;
    const bucket = lum[j]!;
    histogram[bucket] = (histogram[bucket] ?? 0) + 1;
  }
  const total = lum.length;
  let low = 0;
  let high = 255;
  for (let acc = 0; low < 255; low += 1) {
    acc += histogram[low]!;
    if (acc >= total * 0.01) break;
  }
  for (let acc = 0; high > 0; high -= 1) {
    acc += histogram[high]!;
    if (acc >= total * 0.01) break;
  }
  const range = Math.max(1, high - low);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const v = ((lum[j]! - low) * 255) / range;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
}
