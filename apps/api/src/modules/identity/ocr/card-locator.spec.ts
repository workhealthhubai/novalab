import sharp from 'sharp';
import { locateCard } from './card-locator';

async function scene(
  card: { left: number; top: number; width: number; height: number } | null,
): Promise<Buffer> {
  const base = sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#2a2a2a' } });
  if (!card) return base.png().toBuffer();
  const cardImage = await sharp({
    create: { width: card.width, height: card.height, channels: 3, background: '#d8dde4' },
  })
    .png()
    .toBuffer();
  return base
    .composite([{ input: cardImage, left: card.left, top: card.top }])
    .png()
    .toBuffer();
}

describe('locateCard', () => {
  it('finds a card that is off-centre and small in the frame', async () => {
    const region = await locateCard(await scene({ left: 900, top: 500, width: 600, height: 380 }));
    expect(region).not.toBeNull();
    expect(region!.left).toBeGreaterThanOrEqual(860);
    expect(region!.left).toBeLessThanOrEqual(900);
    expect(region!.width).toBeGreaterThanOrEqual(600);
    expect(region!.width).toBeLessThanOrEqual(660);
    expect(region!.top).toBeLessThanOrEqual(500);
    expect(region!.height).toBeGreaterThanOrEqual(380);
  });

  it('returns null when there is no card-sized bright region', async () => {
    expect(await locateCard(await scene(null))).toBeNull();
    expect(
      await locateCard(await scene({ left: 100, top: 100, width: 120, height: 80 })),
    ).toBeNull();
  });
});
