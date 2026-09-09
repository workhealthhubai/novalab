import bwipjs from 'bwip-js';
import type { PinoLogger } from 'nestjs-pino';
import sharp from 'sharp';
import { BarcodeService } from './barcode.service';

const logger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as PinoLogger;

async function cardWithBarcode(width: number, blur: number): Promise<Buffer> {
  const barcode = await bwipjs.toBuffer({
    bcid: 'code128',
    text: 'A11Y47971',
    scale: 3,
    height: 10,
    includetext: false,
  });
  const bar = await sharp(barcode).resize({ width: 370 }).toBuffer();
  const card = await sharp({
    create: { width: 1114, height: 720, channels: 3, background: '#d8dde4' },
  })
    .composite([{ input: bar, left: 500, top: 40 }])
    .png()
    .toBuffer();
  const scene = await sharp({
    create: { width: 1300, height: 900, channels: 3, background: '#222' },
  })
    .composite([{ input: card, left: 90, top: 90 }])
    .png()
    .toBuffer();
  return sharp(scene).blur(blur).resize({ width }).jpeg({ quality: 60 }).toBuffer();
}

describe('BarcodeService', () => {
  const service = new BarcodeService(logger);

  it('decodes the Code 128 document number from a card photo', async () => {
    await expect(service.read(await cardWithBarcode(1300, 0.6))).resolves.toEqual({
      format: 'Code128',
      text: 'A11Y47971',
    });
  });

  it('still decodes a small, blurry photo', async () => {
    await expect(service.read(await cardWithBarcode(900, 1.0))).resolves.toEqual({
      format: 'Code128',
      text: 'A11Y47971',
    });
  });

  it('returns null when there is no barcode', async () => {
    const plain = await sharp({
      create: { width: 800, height: 500, channels: 3, background: '#d8dde4' },
    })
      .png()
      .toBuffer();
    await expect(service.read(plain)).resolves.toBeNull();
  });
});
