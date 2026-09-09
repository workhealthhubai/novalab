import {
  ageAt,
  analyzeSpirometry,
  type SmokingStatus,
  SPIROMETRY_RANGES,
  type SpirometryPattern,
} from '@osgb/shared-types';
import type { PatientListItem } from '@/types/patient';
import type { SpirometryInput, SpirometryTest } from '@/types/spirometry';

export interface SpirometryFormValues {
  patient: PatientListItem | null;
  protocolId: string | null;
  date: string;
  time: string;
  deviceName: string;
  heightCm: string;
  weightKg: string;
  smokingStatus: SmokingStatus | null;
  fvc: string;
  fev1: string;
  ratio: string;
  pef: string;
  fef2575: string;
  fvcPredicted: string;
  fev1Predicted: string;
  bronchodilator: boolean;
  postFvc: string;
  postFev1: string;
  qualityGrade: string;
  isBaseline: boolean;
  pattern: SpirometryPattern | null;
  comment: string;
}

export type NumericField =
  | 'heightCm'
  | 'weightKg'
  | 'fvc'
  | 'fev1'
  | 'ratio'
  | 'pef'
  | 'fef2575'
  | 'fvcPredicted'
  | 'fev1Predicted'
  | 'postFvc'
  | 'postFev1';

const RANGE: Record<NumericField, { min: number; max: number; decimals: number }> = {
  heightCm: { ...SPIROMETRY_RANGES.heightCm, decimals: 0 },
  weightKg: { ...SPIROMETRY_RANGES.weightKg, decimals: 1 },
  fvc: { ...SPIROMETRY_RANGES.fvc, decimals: 2 },
  fev1: { ...SPIROMETRY_RANGES.fev1, decimals: 2 },
  ratio: { ...SPIROMETRY_RANGES.ratio, decimals: 1 },
  pef: { ...SPIROMETRY_RANGES.pef, decimals: 2 },
  fef2575: { ...SPIROMETRY_RANGES.fef2575, decimals: 2 },
  fvcPredicted: { ...SPIROMETRY_RANGES.fvc, decimals: 2 },
  fev1Predicted: { ...SPIROMETRY_RANGES.fev1, decimals: 2 },
  postFvc: { ...SPIROMETRY_RANGES.fvc, decimals: 2 },
  postFev1: { ...SPIROMETRY_RANGES.fev1, decimals: 2 },
};

const pad = (n: number) => String(n).padStart(2, '0');
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function initialValues(seed: {
  patient?: PatientListItem | null;
  protocolId?: string | null;
  test?: SpirometryTest | null;
}): SpirometryFormValues {
  const t = seed.test ?? null;
  const d = t ? new Date(t.performedAt) : new Date();
  return {
    patient: seed.patient ?? null,
    protocolId: t?.protocolId ?? seed.protocolId ?? null,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    deviceName: t?.deviceName ?? '',
    heightCm: str(t?.heightCm),
    weightKg: str(t?.weightKg),
    smokingStatus: t?.smokingStatus ?? null,
    fvc: str(t?.fvc),
    fev1: str(t?.fev1),
    ratio: str(t?.ratio),
    pef: str(t?.pef),
    fef2575: str(t?.fef2575),
    fvcPredicted: str(t?.fvcPredicted),
    fev1Predicted: str(t?.fev1Predicted),
    bronchodilator: Boolean(t?.postFev1 || t?.postFvc),
    postFvc: str(t?.postFvc),
    postFev1: str(t?.postFev1),
    qualityGrade: t?.qualityGrade ?? '',
    isBaseline: t?.isBaseline ?? false,
    pattern: t?.pattern ?? null,
    comment: t?.comment ?? '',
  };
}

export function numberError(field: NumericField, raw: string): string | null {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  const { min, max, decimals } = RANGE[field];
  if (!Number.isFinite(n) || n < min || n > max) return `${min}…${max} arası`;
  if (decimals === 0 && !Number.isInteger(n)) return 'Tam sayı';
  return null;
}

function num(field: NumericField, raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (text === '') return null;
  const { decimals } = RANGE[field];
  return Math.round(Number(text) * 10 ** decimals) / 10 ** decimals;
}

export function parsed(v: SpirometryFormValues) {
  return {
    heightCm: num('heightCm', v.heightCm),
    weightKg: num('weightKg', v.weightKg),
    fvc: num('fvc', v.fvc),
    fev1: num('fev1', v.fev1),
    ratio: num('ratio', v.ratio),
    pef: num('pef', v.pef),
    fef2575: num('fef2575', v.fef2575),
    fvcPredicted: num('fvcPredicted', v.fvcPredicted),
    fev1Predicted: num('fev1Predicted', v.fev1Predicted),
    postFvc: v.bronchodilator ? num('postFvc', v.postFvc) : null,
    postFev1: v.bronchodilator ? num('postFev1', v.postFev1) : null,
  };
}

/** Live analysis for the form (baseline decline is only known on the server). */
export function analyze(v: SpirometryFormValues) {
  const p = parsed(v);
  const at = new Date(`${v.date || '2000-01-01'}T12:00:00`);
  return analyzeSpirometry(p, {
    sex: v.patient?.gender ?? null,
    heightCm: p.heightCm,
    ageYears: ageAt(v.patient?.birthDate ?? null, at),
  });
}

export function formErrors(v: SpirometryFormValues): string[] {
  const errors: string[] = [];
  for (const field of Object.keys(RANGE) as NumericField[])
    if (numberError(field, v[field])) errors.push(field);
  const p = parsed(v);
  if (p.fvc && p.fev1 && p.fev1 > p.fvc) errors.push('fev1');
  if (p.postFvc && p.postFev1 && p.postFev1 > p.postFvc) errors.push('postFev1');
  return errors;
}

export function isEmpty(v: SpirometryFormValues): boolean {
  const p = parsed(v);
  return !p.fvc && !p.fev1;
}

export function toInput(v: SpirometryFormValues): SpirometryInput {
  return {
    employeeId: v.patient!.id,
    protocolId: v.protocolId,
    performedAt: new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString(),
    deviceName: v.deviceName.trim() || null,
    smokingStatus: v.smokingStatus,
    ...parsed(v),
    qualityGrade: v.qualityGrade.trim().toUpperCase() || null,
    isBaseline: v.isBaseline,
    pattern: v.pattern,
    comment: v.comment.trim() || null,
  };
}
