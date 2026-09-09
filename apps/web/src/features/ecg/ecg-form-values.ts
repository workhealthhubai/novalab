import { analyzeEcg, type EcgInterpretation, type EcgRhythm, ECG_RANGES } from '@osgb/shared-types';
import type { EcgInput, EcgRecord } from '@/types/ecg';
import type { PatientListItem } from '@/types/patient';

export interface EcgFormValues {
  patient: PatientListItem | null;
  protocolId: string | null;
  date: string;
  time: string;
  deviceName: string;
  heartRate: string;
  rhythm: EcgRhythm | null;
  prInterval: string;
  qrsDuration: string;
  qtInterval: string;
  qtcInterval: string;
  axis: string;
  findings: string[];
  interpretation: EcgInterpretation | null;
  comment: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));

export function initialValues(seed: {
  patient?: PatientListItem | null;
  protocolId?: string | null;
  record?: EcgRecord | null;
}): EcgFormValues {
  const r = seed.record ?? null;
  const d = r ? new Date(r.performedAt) : new Date();
  return {
    patient: seed.patient ?? null,
    protocolId: r?.protocolId ?? seed.protocolId ?? null,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    deviceName: r?.deviceName ?? '',
    heartRate: str(r?.heartRate),
    rhythm: r?.rhythm ?? null,
    prInterval: str(r?.prInterval),
    qrsDuration: str(r?.qrsDuration),
    qtInterval: str(r?.qtInterval),
    qtcInterval: str(r?.qtcInterval),
    axis: str(r?.axis),
    findings: r?.findings ?? [],
    interpretation: r?.interpretation ?? null,
    comment: r?.comment ?? '',
  };
}

type NumericField =
  'heartRate' | 'prInterval' | 'qrsDuration' | 'qtInterval' | 'qtcInterval' | 'axis';
const RANGE: Record<NumericField, { min: number; max: number }> = {
  heartRate: ECG_RANGES.heartRate,
  prInterval: ECG_RANGES.prInterval,
  qrsDuration: ECG_RANGES.qrsDuration,
  qtInterval: ECG_RANGES.qtInterval,
  qtcInterval: ECG_RANGES.qtcInterval,
  axis: ECG_RANGES.axis,
};

export function numberError(field: NumericField, raw: string): string | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  const { min, max } = RANGE[field];
  return Number.isInteger(n) && n >= min && n <= max ? null : `${min}…${max} arası tam sayı`;
}

function num(raw: string): number | null {
  return raw.trim() === '' ? null : Number(raw);
}

export function parsed(v: EcgFormValues) {
  return {
    heartRate: num(v.heartRate),
    rhythm: v.rhythm,
    prInterval: num(v.prInterval),
    qrsDuration: num(v.qrsDuration),
    qtInterval: num(v.qtInterval),
    qtcInterval: num(v.qtcInterval),
    axis: num(v.axis),
    findings: v.findings,
  };
}

/** Live suggestion shown next to the interpretation choice. */
export function suggest(v: EcgFormValues) {
  return analyzeEcg(parsed(v), v.patient?.gender ?? null);
}

export function hasNumberErrors(v: EcgFormValues): boolean {
  return (Object.keys(RANGE) as NumericField[]).some((f) => numberError(f, v[f]) !== null);
}

export function toInput(v: EcgFormValues): EcgInput {
  return {
    employeeId: v.patient!.id,
    protocolId: v.protocolId,
    performedAt: new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString(),
    deviceName: v.deviceName.trim() || null,
    ...parsed(v),
    interpretation: v.interpretation ?? suggest(v).suggested,
    comment: v.comment.trim() || null,
  };
}
