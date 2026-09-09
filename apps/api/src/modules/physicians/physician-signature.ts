import sharp from 'sharp';

export const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;
export const SIGNATURE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
/** Signatures are wide and short; this box keeps them crisp on A4 reports without huge files. */
export const SIGNATURE_BOX = { width: 800, height: 300 };

/** Fits the image into the signature box, trims surrounding whitespace, outputs PNG with alpha kept. */
export async function prepareSignature(
  input: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input)
    .rotate()
    .trim({ threshold: 10 })
    .resize({ ...SIGNATURE_BOX, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}
