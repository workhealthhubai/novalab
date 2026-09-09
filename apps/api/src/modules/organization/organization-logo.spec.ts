import sharp from 'sharp';
import { LOGO_MAX_EDGE, prepareLogo } from './organization-logo';

describe('prepareLogo', () => {
  it('fits large logos into the box and keeps transparency as PNG', async () => {
    const input = await sharp({
      create: { width: 2400, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const logo = await prepareLogo(input);
    expect(logo.width).toBe(LOGO_MAX_EDGE);
    expect(logo.height).toBe(200);
    const meta = await sharp(logo.buffer).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
  });

  it('rasterises SVG input', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="#0d9488"/></svg>',
    );
    const logo = await prepareLogo(svg);
    expect((await sharp(logo.buffer).metadata()).format).toBe('png');
    expect(logo.width).toBeLessThanOrEqual(LOGO_MAX_EDGE);
  });
});
