/**
 * Finds an ID card in a photo from a small grayscale copy: the card is the large bright, roughly
 * rectangular area against a darker background (desk, hand). Pure math, shared by the API
 * (sharp produces the gray copy) and the browser (canvas produces it).
 */
export interface CardRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Width of the grayscale copy the analysis expects; a few ms of work at this size. */
export const CARD_ANALYSIS_WIDTH = 320;
/** Fraction of a row/column that must be bright for it to count as "card". */
const LINE_FILL = 0.3;
const MARGIN = 0.03;

/** Otsu's threshold over an 8-bit histogram. */
function otsu(histogram: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i]!;
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t += 1) {
    wB += histogram[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Longest run of indexes whose value is >= minimum. */
function longestRun(values: number[], minimum: number): [number, number] | null {
  let bestStart = -1;
  let bestLength = 0;
  let start = -1;
  for (let i = 0; i <= values.length; i += 1) {
    const on = i < values.length && values[i]! >= minimum;
    if (on && start === -1) start = i;
    if (!on && start !== -1) {
      if (i - start > bestLength) {
        bestLength = i - start;
        bestStart = start;
      }
      start = -1;
    }
  }
  return bestLength > 0 ? [bestStart, bestLength] : null;
}

/**
 * Locates the card in a grayscale image (one byte per pixel, row-major). `scale` maps the analysis
 * pixels back to the original image (originalWidth / width). Returns null when no plausible
 * card-sized region is found (the caller then uses the full frame).
 */
export function locateCardInGray(
  gray: ArrayLike<number>,
  width: number,
  height: number,
  scale = 1,
): CardRegion | null {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i += 1) histogram[gray[i]!] = (histogram[gray[i]!] ?? 0) + 1;
  const threshold = otsu(histogram, gray.length);

  const rows = new Array<number>(height).fill(0);
  const cols = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (gray[y * width + x]! >= threshold) {
        rows[y] = (rows[y] ?? 0) + 1;
        cols[x] = (cols[x] ?? 0) + 1;
      }
    }
  }
  const rowRun = longestRun(
    rows.map((v) => v / width),
    LINE_FILL,
  );
  const colRun = longestRun(
    cols.map((v) => v / height),
    LINE_FILL,
  );
  if (!rowRun || !colRun) return null;

  const [top, h] = rowRun;
  const [left, w] = colRun;
  const area = (w * h) / (width * height);
  const aspect = w / h;
  // A card fills between ~8% and ~95% of the frame and is wider than tall (1.2-2.2 including tilt).
  if (area < 0.08 || area > 0.95 || aspect < 1.2 || aspect > 2.2) return null;

  const marginX = Math.round(w * MARGIN);
  const marginY = Math.round(h * MARGIN);
  const region = {
    left: Math.max(0, left - marginX),
    top: Math.max(0, top - marginY),
    width: Math.min(width, w + marginX * 2),
    height: Math.min(height, h + marginY * 2),
  };
  if (region.left + region.width > width) region.width = width - region.left;
  if (region.top + region.height > height) region.height = height - region.top;
  return {
    left: Math.round(region.left * scale),
    top: Math.round(region.top * scale),
    width: Math.round(region.width * scale),
    height: Math.round(region.height * scale),
  };
}
