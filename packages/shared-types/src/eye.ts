/**
 * Eye examination helpers shared by the API and the web. Distance acuity is stored as a decimal
 * (1.0 = 6/6 = 20/20); near acuity as a Jaeger number (J1 best … J10). Colour vision is the number
 * of Ishihara plates read correctly out of the plates shown.
 */
export const ColorVisionResult = {
  NORMAL: 'NORMAL',
  DEFICIENT: 'DEFICIENT',
  NOT_TESTED: 'NOT_TESTED',
} as const;
export type ColorVisionResult = (typeof ColorVisionResult)[keyof typeof ColorVisionResult];

export const VisualFieldResult = {
  NORMAL: 'NORMAL',
  ABNORMAL: 'ABNORMAL',
  NOT_TESTED: 'NOT_TESTED',
} as const;
export type VisualFieldResult = (typeof VisualFieldResult)[keyof typeof VisualFieldResult];

export const EyeRecommendation = {
  NONE: 'NONE',
  GLASSES: 'GLASSES',
  REFERRAL: 'REFERRAL',
} as const;
export type EyeRecommendation = (typeof EyeRecommendation)[keyof typeof EyeRecommendation];

export const EYE_RANGES = {
  acuity: { min: 0.05, max: 2 },
  jaeger: { min: 1, max: 10 },
  ishiharaPlates: { min: 1, max: 38 },
} as const;

/** Decimal acuity at or above this is considered normal distance vision. */
export const NORMAL_ACUITY = 0.8;
/** Uncorrected acuity below this with a good corrected value means glasses are needed at work. */
export const GLASSES_NEEDED_BELOW = 0.5;
/** Ishihara: this share of plates read correctly (screening plates) is normal. */
export const ISHIHARA_NORMAL_RATIO = 0.85;
/** Interocular difference (decimal) that counts as asymmetry. */
export const ACUITY_ASYMMETRY = 0.3;

/** Common decimal steps offered as quick picks. */
export const ACUITY_STEPS: readonly number[] = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2,
];

/** Accepts "0,8", "0.8", "6/12", "20/40" → decimal; null when empty; NaN when unreadable. */
export function parseAcuity(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const snellen = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(text);
  if (snellen) {
    const num = Number(snellen[1]);
    const den = Number(snellen[2]);
    return den > 0 ? Math.round((num / den) * 100) / 100 : Number.NaN;
  }
  const value = Number(text);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : Number.NaN;
}

/** Decimal → Snellen (metric 6/x) label for display, e.g. 0.5 → "6/12". */
export function snellenLabel(decimal: number | null | undefined): string | null {
  if (!decimal || decimal <= 0) return null;
  return `6/${Math.round(6 / decimal)}`;
}

export interface EyeInput {
  farRight?: number | null;
  farLeft?: number | null;
  farRightCorrected?: number | null;
  farLeftCorrected?: number | null;
  nearRight?: number | null;
  nearLeft?: number | null;
  ishiharaCorrect?: number | null;
  ishiharaTotal?: number | null;
  colorVision?: ColorVisionResult | null;
  visualField?: VisualFieldResult | null;
}

export type EyeFlag =
  | 'LOW_ACUITY_RIGHT'
  | 'LOW_ACUITY_LEFT'
  | 'GLASSES_NEEDED'
  | 'ASYMMETRY'
  | 'COLOR_DEFICIENCY'
  | 'VISUAL_FIELD_ABNORMAL'
  | 'NEAR_VISION_REDUCED';

export interface EyeAnalysis {
  /** Best acuity per eye (corrected when available). */
  bestRight: number | null;
  bestLeft: number | null;
  colorVision: ColorVisionResult;
  colorVisionSource: 'plates' | 'given' | null;
  flags: EyeFlag[];
  /** Suggested recommendation; the physician may override. */
  suggested: EyeRecommendation;
}

const best = (
  uncorrected: number | null | undefined,
  corrected: number | null | undefined,
): number | null => corrected ?? uncorrected ?? null;

export function analyzeEye(input: EyeInput): EyeAnalysis {
  const bestRight = best(input.farRight, input.farRightCorrected);
  const bestLeft = best(input.farLeft, input.farLeftCorrected);
  const flags: EyeFlag[] = [];
  if (bestRight !== null && bestRight < NORMAL_ACUITY) flags.push('LOW_ACUITY_RIGHT');
  if (bestLeft !== null && bestLeft < NORMAL_ACUITY) flags.push('LOW_ACUITY_LEFT');
  const glassesNeeded = (['Right', 'Left'] as const).some((side) => {
    const un = input[`far${side}`];
    const co = input[`far${side}Corrected`];
    return (
      un !== null &&
      un !== undefined &&
      un < GLASSES_NEEDED_BELOW &&
      co !== null &&
      co !== undefined &&
      co >= NORMAL_ACUITY
    );
  });
  if (glassesNeeded) flags.push('GLASSES_NEEDED');
  if (bestRight !== null && bestLeft !== null && Math.abs(bestRight - bestLeft) >= ACUITY_ASYMMETRY)
    flags.push('ASYMMETRY');
  if ((input.nearRight ?? 0) > 2 || (input.nearLeft ?? 0) > 2) flags.push('NEAR_VISION_REDUCED');

  let colorVision: ColorVisionResult = input.colorVision ?? 'NOT_TESTED';
  let colorVisionSource: EyeAnalysis['colorVisionSource'] =
    input.colorVision && input.colorVision !== 'NOT_TESTED' ? 'given' : null;
  if (
    input.ishiharaCorrect !== null &&
    input.ishiharaCorrect !== undefined &&
    input.ishiharaTotal
  ) {
    colorVision =
      input.ishiharaCorrect / input.ishiharaTotal >= ISHIHARA_NORMAL_RATIO ? 'NORMAL' : 'DEFICIENT';
    colorVisionSource = 'plates';
  }
  if (colorVision === 'DEFICIENT') flags.push('COLOR_DEFICIENCY');
  if (input.visualField === 'ABNORMAL') flags.push('VISUAL_FIELD_ABNORMAL');

  const suggested: EyeRecommendation =
    flags.includes('VISUAL_FIELD_ABNORMAL') ||
    flags.includes('LOW_ACUITY_RIGHT') ||
    flags.includes('LOW_ACUITY_LEFT') ||
    flags.includes('ASYMMETRY')
      ? 'REFERRAL'
      : flags.includes('GLASSES_NEEDED') || flags.includes('NEAR_VISION_REDUCED')
        ? 'GLASSES'
        : 'NONE';
  return { bestRight, bestLeft, colorVision, colorVisionSource, flags, suggested };
}
