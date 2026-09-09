import { CARD_ANALYSIS_WIDTH, type CardRegion, locateCardInGray } from '@osgb/shared-types';
import sharp from 'sharp';

export type { CardRegion };

/** Locates the ID card in a photo (sharp produces the small grayscale copy; the analysis is shared). */
export async function locateCard(image: Buffer): Promise<CardRegion | null> {
  const { data, info } = await sharp(image)
    .resize({ width: CARD_ANALYSIS_WIDTH })
    .grayscale()
    .blur(1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const scale = (await sharp(image).metadata()).width / info.width;
  return locateCardInGray(data, info.width, info.height, scale);
}
