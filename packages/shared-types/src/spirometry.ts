/**
 * Spirometry (SFT) helpers shared by the API and the web. Volumes in litres, flows in L/s,
 * ratios in percent. Predicted values come from the device when present; otherwise the ECSC 1993
 * (Quanjer) reference equations are used for adults (18–70 y).
 */
export const SpirometryPattern = {
  NORMAL: 'NORMAL',
  OBSTRUCTIVE: 'OBSTRUCTIVE',
  RESTRICTIVE: 'RESTRICTIVE',
  MIXED: 'MIXED',
} as const;
export type SpirometryPattern = (typeof SpirometryPattern)[keyof typeof SpirometryPattern];

export const SmokingStatus = {
  NEVER: 'NEVER',
  FORMER: 'FORMER',
  CURRENT: 'CURRENT',
} as const;
export type SmokingStatus = (typeof SmokingStatus)[keyof typeof SmokingStatus];

export const SPIROMETRY_RANGES = {
  fvc: { min: 0.3, max: 9 },
  fev1: { min: 0.2, max: 8 },
  ratio: { min: 10, max: 100 },
  pef: { min: 0.5, max: 20 },
  fef2575: { min: 0.1, max: 12 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 300 },
  age: { min: 14, max: 100 },
} as const;

/** Fixed-ratio obstruction cut-off used by most OSGB devices (ATS/ERS also accepts LLN). */
export const OBSTRUCTION_RATIO_PERCENT = 70;
/** FVC below this % of predicted with a normal ratio suggests restriction. */
export const RESTRICTION_FVC_PERCENT = 80;
/** Bronchodilator response: FEV1 gain ≥ 12 % and ≥ 200 mL. */
export const BD_RESPONSE_PERCENT = 12;
export const BD_RESPONSE_ML = 200;
/** Longitudinal decline of FEV1 vs baseline that warrants attention (NIOSH-style 15 %). */
export const FEV1_DECLINE_PERCENT = 15;

export type SpirometrySeverityKey =
  'MILD' | 'MODERATE' | 'MODERATELY_SEVERE' | 'SEVERE' | 'VERY_SEVERE';
export const SPIROMETRY_SEVERITY: ReadonlyArray<{
  key: SpirometrySeverityKey;
  label: string;
  minPercent: number;
}> = [
  { key: 'MILD', label: 'Hafif', minPercent: 70 },
  { key: 'MODERATE', label: 'Orta', minPercent: 60 },
  { key: 'MODERATELY_SEVERE', label: 'Orta-ağır', minPercent: 50 },
  { key: 'SEVERE', label: 'Ağır', minPercent: 35 },
  { key: 'VERY_SEVERE', label: 'Çok ağır', minPercent: 0 },
];

/** ECSC 1993 adult reference values; null outside the validated age range or without inputs. */
export function ecscPredicted(
  sex: 'MALE' | 'FEMALE' | null | undefined,
  heightCm: number | null | undefined,
  ageYears: number | null | undefined,
): { fvc: number; fev1: number; ratio: number } | null {
  if (!sex || !heightCm || !ageYears || ageYears < 18 || ageYears > 70) return null;
  const h = heightCm / 100;
  const a = ageYears;
  const r = (v: number) => Math.round(v * 100) / 100;
  if (sex === 'MALE')
    return {
      fvc: r(5.76 * h - 0.026 * a - 4.34),
      fev1: r(4.3 * h - 0.029 * a - 2.49),
      ratio: Math.round((87.21 - 0.18 * a) * 10) / 10,
    };
  return {
    fvc: r(4.43 * h - 0.026 * a - 2.89),
    fev1: r(3.95 * h - 0.025 * a - 2.6),
    ratio: Math.round((89.1 - 0.19 * a) * 10) / 10,
  };
}

export function ageAt(birthDate: Date | string | null | undefined, at: Date): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age -= 1;
  return age;
}

export function percentOf(
  value: number | null | undefined,
  predicted: number | null | undefined,
): number | null {
  if (!value || !predicted || predicted <= 0) return null;
  return Math.round((value / predicted) * 100);
}

export interface SpirometryInput {
  fvc?: number | null;
  fev1?: number | null;
  /** Measured FEV1/FVC %, when the device reports it; otherwise derived. */
  ratio?: number | null;
  pef?: number | null;
  fef2575?: number | null;
  fvcPredicted?: number | null;
  fev1Predicted?: number | null;
  postFvc?: number | null;
  postFev1?: number | null;
}

export type SpirometryFlag =
  | 'OBSTRUCTION'
  | 'RESTRICTION_SUGGESTED'
  | 'MIXED'
  | 'LOW_PEF'
  | 'BD_RESPONSE'
  | 'FEV1_DECLINE'
  | 'NO_PREDICTED';

export interface SpirometryAnalysis {
  ratio: number | null;
  ratioSource: 'device' | 'derived' | null;
  predicted: {
    fvc: number | null;
    fev1: number | null;
    ratio: number | null;
    source: 'device' | 'ecsc' | null;
  };
  fvcPercent: number | null;
  fev1Percent: number | null;
  pattern: SpirometryPattern | null;
  severity: { key: SpirometrySeverityKey; label: string } | null;
  bronchodilator: { fev1GainMl: number; fev1GainPercent: number; positive: boolean } | null;
  fev1DeclinePercent: number | null;
  flags: SpirometryFlag[];
}

export function analyzeSpirometry(
  input: SpirometryInput,
  subject: { sex: 'MALE' | 'FEMALE' | null; heightCm: number | null; ageYears: number | null },
  baselineFev1?: number | null,
): SpirometryAnalysis {
  const fvc = input.fvc ?? null;
  const fev1 = input.fev1 ?? null;
  const derivedRatio = fvc && fev1 ? Math.round((fev1 / fvc) * 1000) / 10 : null;
  const ratio = input.ratio ?? derivedRatio;
  const ratioSource: SpirometryAnalysis['ratioSource'] = input.ratio
    ? 'device'
    : derivedRatio !== null
      ? 'derived'
      : null;

  const ecsc = ecscPredicted(subject.sex, subject.heightCm, subject.ageYears);
  const devicePred = input.fvcPredicted || input.fev1Predicted;
  const predicted = {
    fvc: input.fvcPredicted ?? ecsc?.fvc ?? null,
    fev1: input.fev1Predicted ?? ecsc?.fev1 ?? null,
    ratio: ecsc?.ratio ?? null,
    source: devicePred ? ('device' as const) : ecsc ? ('ecsc' as const) : null,
  };
  const fvcPercent = percentOf(fvc, predicted.fvc);
  const fev1Percent = percentOf(fev1, predicted.fev1);

  const flags: SpirometryFlag[] = [];
  let pattern: SpirometryPattern | null = null;
  if (ratio !== null) {
    const obstructed = ratio < OBSTRUCTION_RATIO_PERCENT;
    const lowFvc = fvcPercent !== null && fvcPercent < RESTRICTION_FVC_PERCENT;
    if (obstructed && lowFvc) pattern = 'MIXED';
    else if (obstructed) pattern = 'OBSTRUCTIVE';
    else if (lowFvc) pattern = 'RESTRICTIVE';
    else pattern = 'NORMAL';
    if (pattern === 'OBSTRUCTIVE') flags.push('OBSTRUCTION');
    if (pattern === 'RESTRICTIVE') flags.push('RESTRICTION_SUGGESTED');
    if (pattern === 'MIXED') flags.push('MIXED');
  }
  const severity =
    pattern && pattern !== 'NORMAL' && fev1Percent !== null
      ? (SPIROMETRY_SEVERITY.find((s) => fev1Percent >= s.minPercent) ?? null)
      : null;
  if (fvc !== null && fev1 !== null && predicted.source === null) flags.push('NO_PREDICTED');
  if (input.pef && predicted.fev1 && input.pef < predicted.fev1 * 1.2 * 0.6) flags.push('LOW_PEF');

  let bronchodilator: SpirometryAnalysis['bronchodilator'] = null;
  if (fev1 && input.postFev1) {
    const gainMl = Math.round((input.postFev1 - fev1) * 1000);
    const gainPercent = Math.round(((input.postFev1 - fev1) / fev1) * 1000) / 10;
    const positive = gainMl >= BD_RESPONSE_ML && gainPercent >= BD_RESPONSE_PERCENT;
    bronchodilator = { fev1GainMl: gainMl, fev1GainPercent: gainPercent, positive };
    if (positive) flags.push('BD_RESPONSE');
  }

  let fev1DeclinePercent: number | null = null;
  if (fev1 && baselineFev1) {
    fev1DeclinePercent = Math.round(((baselineFev1 - fev1) / baselineFev1) * 1000) / 10;
    if (fev1DeclinePercent >= FEV1_DECLINE_PERCENT) flags.push('FEV1_DECLINE');
  }

  return {
    ratio,
    ratioSource,
    predicted,
    fvcPercent,
    fev1Percent,
    pattern,
    severity: severity ? { key: severity.key, label: severity.label } : null,
    bronchodilator,
    fev1DeclinePercent,
    flags,
  };
}
