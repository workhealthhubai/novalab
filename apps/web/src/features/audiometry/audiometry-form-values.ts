import type { AudiometryInput, AudiometryTest } from '@/types/audiometry';
import type { PatientListItem } from '@/types/patient';
import { draftIsEmpty, fromDraft, type ThresholdDraft, toDraft } from './threshold-draft';

export interface AudiometryFormValues {
  patient: PatientListItem | null;
  protocolId: string | null;
  date: string;
  time: string;
  deviceName: string;
  isBaseline: boolean;
  quietHours: string;
  airRight: ThresholdDraft;
  airLeft: ThresholdDraft;
  bone: boolean;
  boneRight: ThresholdDraft;
  boneLeft: ThresholdDraft;
  notes: string;
}

function nowParts(): { date: string; time: string } {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function initialValues(seed: {
  patient?: PatientListItem | null;
  protocolId?: string | null;
  test?: AudiometryTest | null;
}): AudiometryFormValues {
  const t = seed.test ?? null;
  const performed = t ? new Date(t.performedAt) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    patient: seed.patient ?? null,
    protocolId: t?.protocolId ?? seed.protocolId ?? null,
    date: performed
      ? `${performed.getFullYear()}-${pad(performed.getMonth() + 1)}-${pad(performed.getDate())}`
      : nowParts().date,
    time: performed
      ? `${pad(performed.getHours())}:${pad(performed.getMinutes())}`
      : nowParts().time,
    deviceName: t?.deviceName ?? '',
    isBaseline: t?.isBaseline ?? false,
    quietHours: t?.quietHours === null || t?.quietHours === undefined ? '' : String(t.quietHours),
    airRight: toDraft(t?.airRight),
    airLeft: toDraft(t?.airLeft),
    bone: Boolean(t?.boneRight || t?.boneLeft),
    boneRight: toDraft(t?.boneRight),
    boneLeft: toDraft(t?.boneLeft),
    notes: t?.notes ?? '',
  };
}

export function toInput(v: AudiometryFormValues): AudiometryInput {
  const performedAt = new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString();
  return {
    employeeId: v.patient!.id,
    protocolId: v.protocolId,
    performedAt,
    deviceName: v.deviceName.trim() || null,
    isBaseline: v.isBaseline,
    quietHours: v.quietHours.trim() === '' ? null : Number(v.quietHours),
    airRight: fromDraft(v.airRight),
    airLeft: fromDraft(v.airLeft),
    boneRight: v.bone && !draftIsEmpty(v.boneRight) ? fromDraft(v.boneRight) : null,
    boneLeft: v.bone && !draftIsEmpty(v.boneLeft) ? fromDraft(v.boneLeft) : null,
    notes: v.notes.trim() || null,
  };
}
