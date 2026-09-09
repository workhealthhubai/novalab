import {
  analyzeEye,
  type ColorVisionResult,
  EYE_RANGES,
  type EyeRecommendation,
  parseAcuity,
  type VisualFieldResult,
} from '@osgb/shared-types';
import type { EyeExamination, EyeInput } from '@/types/eye';
import type { PatientListItem } from '@/types/patient';

export interface EyeFormValues {
  patient: PatientListItem | null;
  protocolId: string | null;
  date: string;
  time: string;
  usesGlasses: boolean;
  usesContactLenses: boolean;
  farRight: string;
  farLeft: string;
  corrected: boolean;
  farRightCorrected: string;
  farLeftCorrected: string;
  nearRight: string;
  nearLeft: string;
  ishiharaCorrect: string;
  ishiharaTotal: string;
  colorVision: ColorVisionResult;
  visualField: VisualFieldResult;
  findings: string;
  recommendation: EyeRecommendation | null;
  comment: string;
}

export type AcuityField = 'farRight' | 'farLeft' | 'farRightCorrected' | 'farLeftCorrected';

const pad = (n: number) => String(n).padStart(2, '0');
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function initialValues(seed: {
  patient?: PatientListItem | null;
  protocolId?: string | null;
  exam?: EyeExamination | null;
}): EyeFormValues {
  const e = seed.exam ?? null;
  const d = e ? new Date(e.performedAt) : new Date();
  return {
    patient: seed.patient ?? null,
    protocolId: e?.protocolId ?? seed.protocolId ?? null,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    usesGlasses: e?.usesGlasses ?? false,
    usesContactLenses: e?.usesContactLenses ?? false,
    farRight: str(e?.farRight),
    farLeft: str(e?.farLeft),
    corrected: Boolean(
      e?.farRightCorrected || e?.farLeftCorrected || e?.usesGlasses || e?.usesContactLenses,
    ),
    farRightCorrected: str(e?.farRightCorrected),
    farLeftCorrected: str(e?.farLeftCorrected),
    nearRight: str(e?.nearRight),
    nearLeft: str(e?.nearLeft),
    ishiharaCorrect: str(e?.ishiharaCorrect),
    ishiharaTotal: e ? str(e.ishiharaTotal) : '14',
    colorVision: e?.colorVision ?? 'NOT_TESTED',
    visualField: e?.visualField ?? 'NOT_TESTED',
    findings: e?.findings ?? '',
    recommendation: e?.recommendation ?? null,
    comment: e?.comment ?? '',
  };
}

export function acuityError(raw: string): string | null {
  const v = parseAcuity(raw);
  if (v === null) return null;
  if (Number.isNaN(v) || v < EYE_RANGES.acuity.min || v > EYE_RANGES.acuity.max)
    return `${EYE_RANGES.acuity.min}–${EYE_RANGES.acuity.max} veya 6/x`;
  return null;
}

export function jaegerError(raw: string): string | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= EYE_RANGES.jaeger.min && n <= EYE_RANGES.jaeger.max
    ? null
    : 'J1–J10';
}

function intOrNull(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

export function parsed(v: EyeFormValues) {
  const a = (raw: string) => {
    const p = parseAcuity(raw);
    return p === null || Number.isNaN(p) ? null : p;
  };
  return {
    farRight: a(v.farRight),
    farLeft: a(v.farLeft),
    farRightCorrected: v.corrected ? a(v.farRightCorrected) : null,
    farLeftCorrected: v.corrected ? a(v.farLeftCorrected) : null,
    nearRight: intOrNull(v.nearRight),
    nearLeft: intOrNull(v.nearLeft),
    ishiharaCorrect: intOrNull(v.ishiharaCorrect),
    ishiharaTotal: intOrNull(v.ishiharaTotal),
    colorVision: v.colorVision,
    visualField: v.visualField,
  };
}

export function analyze(v: EyeFormValues) {
  return analyzeEye(parsed(v));
}

export function formErrors(v: EyeFormValues): string[] {
  const errors: string[] = [];
  for (const f of ['farRight', 'farLeft'] as const) if (acuityError(v[f])) errors.push(f);
  if (v.corrected)
    for (const f of ['farRightCorrected', 'farLeftCorrected'] as const)
      if (acuityError(v[f])) errors.push(f);
  for (const f of ['nearRight', 'nearLeft'] as const) if (jaegerError(v[f])) errors.push(f);
  const p = parsed(v);
  if (
    p.ishiharaCorrect !== null &&
    (!p.ishiharaTotal || p.ishiharaCorrect > p.ishiharaTotal || p.ishiharaCorrect < 0)
  )
    errors.push('ishiharaCorrect');
  return errors;
}

export function isEmpty(v: EyeFormValues): boolean {
  const p = parsed(v);
  return p.farRight === null && p.farLeft === null;
}

export function toInput(v: EyeFormValues): EyeInput {
  const p = parsed(v);
  return {
    employeeId: v.patient!.id,
    protocolId: v.protocolId,
    performedAt: new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString(),
    usesGlasses: v.usesGlasses,
    usesContactLenses: v.usesContactLenses,
    ...p,
    ishiharaTotal: p.ishiharaCorrect === null ? null : p.ishiharaTotal,
    findings: v.findings.trim() || null,
    recommendation: v.recommendation ?? analyze(v).suggested,
    comment: v.comment.trim() || null,
  };
}
