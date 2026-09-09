import sharp from 'sharp';

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
/** Logos are stored as PNG (transparency kept) fitting this box; large enough for print headers. */
export const LOGO_MAX_EDGE = 600;

/** Normalises an uploaded logo: fit inside 600×600, PNG, metadata stripped (SVG is rasterised). */
export async function prepareLogo(
  input: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input, { density: 300 })
    .rotate()
    .resize({
      width: LOGO_MAX_EDGE,
      height: LOGO_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}
