import sharp from 'sharp';

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
/** Portraits are stored at most this size on the long edge (enough for a card/report, small to serve). */
export const PHOTO_MAX_EDGE = 800;

export interface PreparedPhoto {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: 'image/jpeg';
}

/**
 * Normalises an uploaded portrait: EXIF orientation applied, downscaled to fit 800×800,
 * re-encoded as JPEG with metadata stripped (no GPS/device data lands in storage).
 */
export async function preparePortrait(input: Buffer): Promise<PreparedPhoto> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({
      width: PHOTO_MAX_EDGE,
      height: PHOTO_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, contentType: 'image/jpeg' };
}
