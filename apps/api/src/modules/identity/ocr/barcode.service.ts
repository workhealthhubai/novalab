import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { readBarcodes, type ReadResult } from 'zxing-wasm/reader';
import type { IdCardBarcode } from '@osgb/shared-types';
import { locateCard } from './card-locator';

const FORMATS = ['Code128', 'Code39', 'PDF417', 'QRCode', 'DataMatrix'] as const;
const UPSCALED_WIDTH = 3000;

/**
 * Decodes the barcode printed on ID cards (zxing WASM). Turkish ID cards carry the card's
 * document/serial number as Code 128 on the back, top right. Several crops are tried because
 * the bars are thin: the whole frame, the located card, and the upper band of each upscaled.
 */
@Injectable()
export class BarcodeService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(BarcodeService.name);
  }

  async read(image: Buffer): Promise<IdCardBarcode | null> {
    const startedAt = Date.now();
    try {
      const oriented = await sharp(image).rotate().toBuffer();
      for (const variant of await this.variants(oriented)) {
        const hit = await this.decode(variant.image);
        if (hit) {
          this.logger.debug(
            { durationMs: Date.now() - startedAt, variant: variant.name, format: hit.format },
            'barcode decoded',
          );
          return hit;
        }
      }
      this.logger.debug({ durationMs: Date.now() - startedAt }, 'no barcode found');
      return null;
    } catch (error) {
      this.logger.warn({ err: error }, 'barcode scan failed');
      return null;
    }
  }

  private async variants(oriented: Buffer): Promise<Array<{ name: string; image: Buffer }>> {
    const { width = 0, height = 0 } = await sharp(oriented).metadata();
    const list: Array<{ name: string; image: Buffer }> = [{ name: 'frame', image: oriented }];
    if (width === 0 || height === 0) return list;
    const sources: Array<{ name: string; image: Buffer; width: number; height: number }> = [
      { name: 'frame', image: oriented, width, height },
    ];
    const card = await locateCard(oriented).catch(() => null);
    if (card && (card.width < width * 0.9 || card.height < height * 0.9)) {
      sources.unshift({
        name: 'card',
        image: await sharp(oriented).extract(card).toBuffer(),
        width: card.width,
        height: card.height,
      });
    }
    for (const source of sources) {
      const bandHeight = Math.round(source.height * 0.45);
      const band = sharp(source.image)
        .extract({ left: 0, top: 0, width: source.width, height: bandHeight })
        .resize({ width: Math.max(source.width, UPSCALED_WIDTH) })
        .normalize();
      list.push({
        name: `${source.name}:top-band-sharpen`,
        image: await band.clone().sharpen().png().toBuffer(),
      });
      list.push({
        name: `${source.name}:top-band-threshold`,
        image: await band.clone().threshold(128).png().toBuffer(),
      });
    }
    return list;
  }

  private async decode(image: Buffer): Promise<IdCardBarcode | null> {
    const { data, info } = await sharp(image)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8ClampedArray(info.width * info.height * 4);
    for (let i = 0, j = 0; i < data.length; i += 1, j += 4) {
      rgba[j] = rgba[j + 1] = rgba[j + 2] = data[i]!;
      rgba[j + 3] = 255;
    }
    const results: ReadResult[] = await readBarcodes(
      { data: rgba, width: info.width, height: info.height, colorSpace: 'srgb' },
      {
        formats: [...FORMATS],
        tryHarder: true,
        tryRotate: true,
        tryDownscale: true,
        maxNumberOfSymbols: 3,
      },
    );
    const hit = results.find((r) => r.isValid && r.text.trim().length > 0);
    return hit ? { format: hit.format, text: hit.text.trim() } : null;
  }
}
