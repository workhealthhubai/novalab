import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { prepareSignature } from '@/modules/physicians/physician-signature';

/** Raw pad output is a PNG data URL; 2 MB is far above what a trimmed stroke image needs. */
export const MAX_SIGNATURE_DATA_BYTES = 2 * 1024 * 1024;
const DATA_URL = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/;

/** Decodes the pad's `data:image/png;base64,…` payload; anything else is rejected. */
export function decodeSignatureDataUrl(value: string): Buffer {
  const match = DATA_URL.exec(value.trim());
  if (!match)
    throw new BadRequestException({
      message: 'Signature must be a PNG data URL',
      errorCode: 'SIGNATURE_INVALID',
    });
  const buffer = Buffer.from(match[1]!.replace(/\s/g, ''), 'base64');
  if (buffer.length === 0 || buffer.length > MAX_SIGNATURE_DATA_BYTES)
    throw new BadRequestException({
      message: 'Signature image is empty or too large',
      errorCode: 'SIGNATURE_INVALID',
    });
  return buffer;
}

/** Trims the pad image; a blank pad (nothing drawn) ends up smaller than a real stroke and is refused. */
export async function prepareSignatureStroke(input: Buffer): Promise<Buffer> {
  let prepared: Awaited<ReturnType<typeof prepareSignature>>;
  try {
    prepared = await prepareSignature(input);
  } catch {
    throw new BadRequestException({
      message: 'Signature image could not be read',
      errorCode: 'SIGNATURE_INVALID',
    });
  }
  if (
    prepared.width < 20 ||
    prepared.height < 8 ||
    (await inkPixels(prepared.buffer)) < MIN_INK_PIXELS
  )
    throw new BadRequestException({ message: 'Signature is empty', errorCode: 'SIGNATURE_EMPTY' });
  return prepared.buffer;
}

/** Fewer opaque dark pixels than a short stroke leaves → treated as a blank pad. */
const MIN_INK_PIXELS = 150;

async function inkPixels(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3]!;
    const luma = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    if (alpha > 64 && luma < 200) count += 1;
  }
  return count;
}
