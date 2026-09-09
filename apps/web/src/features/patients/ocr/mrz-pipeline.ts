import { type IdCardScanResult, scoreMrz, selectBestMrz } from '@osgb/shared-types';

/** Every check digit passed and the key fields are present. */
export const PERFECT_SCORE = 14;

export interface Variant<T> {
  name: string;
  image: T;
}

export interface Recognized {
  text: string;
  confidence: number;
}

/**
 * Runs the recognizer over the variants (most promising first), parses each text as a TD1 MRZ
 * and keeps the best-scoring parse; stops early once every check digit passes.
 */
export async function recognizeVariants<T>(
  variants: Array<Variant<T>>,
  recognize: (image: T) => Promise<Recognized>,
): Promise<{ result: IdCardScanResult; variant: string }> {
  let best: { result: IdCardScanResult; variant: string } | null = null;
  for (const variant of variants) {
    const { text, confidence } = await recognize(variant.image);
    const result = selectBestMrz(text);
    result.confidence = Math.round(confidence);
    if (!best || scoreMrz(result) > scoreMrz(best.result)) best = { result, variant: variant.name };
    if (scoreMrz(result) >= PERFECT_SCORE) break;
  }
  return best ?? { result: selectBestMrz(''), variant: 'none' };
}
