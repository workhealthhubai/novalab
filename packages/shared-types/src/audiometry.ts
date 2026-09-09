/**
 * Pure-tone audiometry helpers shared by the API (validation, stored averages) and the web
 * (audiogram, analysis). Thresholds are dB HL per frequency; `null` = no response / not tested.
 */
export const AUDIOMETRY_FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export type AudiometryFrequency = (typeof AUDIOMETRY_FREQUENCIES)[number];
export type FrequencyKey = `${AudiometryFrequency}`;
export type Thresholds = Partial<Record<FrequencyKey, number | null>>;

export const THRESHOLD_MIN_DB = -10;
export const THRESHOLD_MAX_DB = 120;
export const THRESHOLD_STEP_DB = 5;

/** Four-frequency average used for the hearing grade (500, 1000, 2000, 4000 Hz). */
export const PTA_FREQUENCIES: readonly AudiometryFrequency[] = [500, 1000, 2000, 4000];
/** Standard threshold shift (OSHA 1910.95): average change at 2000, 3000, 4000 Hz ≥ 10 dB. */
export const STS_FREQUENCIES: readonly AudiometryFrequency[] = [2000, 3000, 4000];
export const STS_THRESHOLD_DB = 10;

export type HearingGradeKey =
  'NORMAL' | 'MILD' | 'MODERATE' | 'MODERATELY_SEVERE' | 'SEVERE' | 'PROFOUND';
export interface HearingGrade {
  key: HearingGradeKey;
  label: string;
  /** Upper PTA bound (inclusive), dB HL. */
  max: number;
}
export const HEARING_GRADES: readonly HearingGrade[] = [
  { key: 'NORMAL', label: 'Normal', max: 25 },
  { key: 'MILD', label: 'Hafif kayıp', max: 40 },
  { key: 'MODERATE', label: 'Orta kayıp', max: 55 },
  { key: 'MODERATELY_SEVERE', label: 'Orta-ileri kayıp', max: 70 },
  { key: 'SEVERE', label: 'İleri kayıp', max: 90 },
  { key: 'PROFOUND', label: 'Çok ileri kayıp', max: Number.POSITIVE_INFINITY },
];

export function thresholdAt(t: Thresholds, frequency: AudiometryFrequency): number | null {
  const value = t[`${frequency}`];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Mean of the given frequencies; null when any of them is missing / no response. */
export function averageThreshold(
  t: Thresholds,
  frequencies: readonly AudiometryFrequency[],
): number | null {
  const values = frequencies.map((f) => thresholdAt(t, f));
  if (values.some((v) => v === null)) return null;
  const sum = (values as number[]).reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function gradeHearing(pta: number | null): HearingGrade | null {
  if (pta === null) return null;
  return HEARING_GRADES.find((g) => pta <= g.max) ?? null;
}

/**
 * Noise-induced notch (Coles 2000 style): the threshold at 3, 4 or 6 kHz is at least 10 dB worse
 * than the better of 1–2 kHz and at least 10 dB worse than 8 kHz.
 */
export function hasNoiseNotch(t: Thresholds): boolean {
  const low = [thresholdAt(t, 1000), thresholdAt(t, 2000)].filter((v): v is number => v !== null);
  const high = thresholdAt(t, 8000);
  if (low.length === 0 || high === null) return false;
  const lowBest = Math.min(...low);
  return ([3000, 4000, 6000] as const).some((f) => {
    const v = thresholdAt(t, f);
    return v !== null && v - lowBest >= 10 && v - high >= 10;
  });
}

/** Positive = hearing got worse (thresholds went up). Null when either side lacks a frequency. */
export function thresholdShift(
  current: Thresholds,
  reference: Thresholds,
  frequencies: readonly AudiometryFrequency[] = STS_FREQUENCIES,
): number | null {
  const a = averageThreshold(current, frequencies);
  const b = averageThreshold(reference, frequencies);
  return a === null || b === null ? null : Math.round((a - b) * 10) / 10;
}

export interface EarAnalysis {
  pta: number | null;
  grade: HearingGrade | null;
  noiseNotch: boolean;
  /** Frequencies with no response / not tested. */
  missing: AudiometryFrequency[];
}

export function analyzeEar(t: Thresholds): EarAnalysis {
  const pta = averageThreshold(t, PTA_FREQUENCIES);
  return {
    pta,
    grade: gradeHearing(pta),
    noiseNotch: hasNoiseNotch(t),
    missing: AUDIOMETRY_FREQUENCIES.filter((f) => thresholdAt(t, f) === null),
  };
}

/** Accepts only known frequencies with values on the 5 dB grid inside the audiometer range. */
export function normalizeThresholds(input: unknown): Thresholds {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input))
    throw new Error('Thresholds must be an object');
  const out: Thresholds = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const frequency = Number(key);
    if (!(AUDIOMETRY_FREQUENCIES as readonly number[]).includes(frequency))
      throw new Error(`Unknown frequency ${key}`);
    if (raw === null || raw === undefined || raw === '') {
      out[`${frequency as AudiometryFrequency}`] = null;
      continue;
    }
    const value = typeof raw === 'string' ? Number(raw) : raw;
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < THRESHOLD_MIN_DB ||
      value > THRESHOLD_MAX_DB ||
      value % THRESHOLD_STEP_DB !== 0
    )
      throw new Error(`Invalid threshold at ${key} Hz`);
    out[`${frequency as AudiometryFrequency}`] = value;
  }
  return out;
}
