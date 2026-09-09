import sharp from 'sharp';
import { PHOTO_MAX_EDGE, preparePortrait } from './employee-photo';

describe('preparePortrait', () => {
  it('downscales large portraits to the max edge, keeps aspect ratio and outputs JPEG', async () => {
    const input = await sharp({
      create: { width: 1500, height: 2000, channels: 3, background: '#888' },
    })
      .png()
      .toBuffer();
    const photo = await preparePortrait(input);
    expect(photo.contentType).toBe('image/jpeg');
    expect(photo.height).toBe(PHOTO_MAX_EDGE);
    expect(photo.width).toBe(600);
    expect((await sharp(photo.buffer).metadata()).format).toBe('jpeg');
  });

  it('does not enlarge small images and strips EXIF metadata', async () => {
    const input = await sharp({
      create: { width: 300, height: 400, channels: 3, background: '#888' },
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'test' } } })
      .jpeg()
      .toBuffer();
    const photo = await preparePortrait(input);
    expect(photo.width).toBe(300);
    expect((await sharp(photo.buffer).metadata()).exif).toBeUndefined();
  });
});
