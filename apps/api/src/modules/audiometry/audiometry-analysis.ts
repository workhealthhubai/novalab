import {
  analyzeEar,
  type EarAnalysis,
  normalizeThresholds,
  STS_THRESHOLD_DB,
  type Thresholds,
  thresholdShift,
} from '@osgb/shared-types';

export interface EarShift {
  /** Average change at 2–4 kHz vs the reference (positive = worse); null when not computable. */
  shiftDb: number | null;
  /** Standard threshold shift (≥ 10 dB). */
  sts: boolean;
}

export interface TestAnalysis {
  right: EarAnalysis;
  left: EarAnalysis;
  vsBaseline: { testId: string; performedAt: Date; right: EarShift; left: EarShift } | null;
  vsPrevious: { testId: string; performedAt: Date; right: EarShift; left: EarShift } | null;
  /** Any ear with STS vs baseline, or a noise notch. */
  flags: Array<'STS_BASELINE' | 'STS_PREVIOUS' | 'NOISE_NOTCH' | 'ASYMMETRY'>;
}

/** Prisma returns Json; coerce to the shared Thresholds shape (invalid stored data → empty). */
export function toThresholds(value: unknown): Thresholds {
  try {
    return normalizeThresholds(value);
  } catch {
    return {};
  }
}

function earShift(current: Thresholds, reference: Thresholds): EarShift {
  const shiftDb = thresholdShift(current, reference);
  return { shiftDb, sts: shiftDb !== null && shiftDb >= STS_THRESHOLD_DB };
}

export interface ThresholdSet {
  id: string;
  performedAt: Date;
  airRight: Thresholds;
  airLeft: Thresholds;
}

/** Interaural asymmetry: PTA difference ≥ 15 dB warrants a second look. */
export const ASYMMETRY_DB = 15;

export function analyzeTest(
  current: ThresholdSet,
  baseline: ThresholdSet | null,
  previous: ThresholdSet | null,
): TestAnalysis {
  const right = analyzeEar(current.airRight);
  const left = analyzeEar(current.airLeft);
  const compare = (ref: ThresholdSet | null) =>
    ref
      ? {
          testId: ref.id,
          performedAt: ref.performedAt,
          right: earShift(current.airRight, ref.airRight),
          left: earShift(current.airLeft, ref.airLeft),
        }
      : null;
  const vsBaseline = compare(baseline);
  const vsPrevious = compare(previous);
  const flags: TestAnalysis['flags'] = [];
  if (vsBaseline && (vsBaseline.right.sts || vsBaseline.left.sts)) flags.push('STS_BASELINE');
  if (vsPrevious && (vsPrevious.right.sts || vsPrevious.left.sts)) flags.push('STS_PREVIOUS');
  if (right.noiseNotch || left.noiseNotch) flags.push('NOISE_NOTCH');
  if (right.pta !== null && left.pta !== null && Math.abs(right.pta - left.pta) >= ASYMMETRY_DB)
    flags.push('ASYMMETRY');
  return { right, left, vsBaseline, vsPrevious, flags };
}
