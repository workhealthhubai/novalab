import sharp from 'sharp';
import { prepareSignature, SIGNATURE_BOX } from './physician-signature';

describe('prepareSignature', () => {
  it('trims whitespace around the stroke and fits the box as PNG', async () => {
    const stroke = await sharp({
      create: { width: 1200, height: 200, channels: 3, background: '#1e293b' },
    })
      .png()
      .toBuffer();
    const scanned = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: stroke, left: 400, top: 400 }])
      .jpeg()
      .toBuffer();
    const signature = await prepareSignature(scanned);
    expect(signature.width).toBeLessThanOrEqual(SIGNATURE_BOX.width);
    expect(signature.height).toBeLessThanOrEqual(SIGNATURE_BOX.height);
    // 1200×200 stroke trimmed then scaled to width 800 → about 133 px tall.
    expect(signature.height).toBeLessThan(150);
    expect((await sharp(signature.buffer).metadata()).format).toBe('png');
  });
});
