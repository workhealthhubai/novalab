import { analyzePneumoconiosis, type PneumoconiosisResult } from '@osgb/shared-types';
import type { PatientListItem } from '@/types/patient';
import type { PneumoconiosisInput, PneumoconiosisReading } from '@/types/pneumoconiosis';

export interface PneumoFormValues {
  patient: PatientListItem | null;
  protocolId: string | null;
  radiologyRequestId: string | null;
  date: string;
  time: string;
  readerRole: string;
  filmDate: string;
  filmQuality: number | null;
  qualityComment: string;
  profusion: string | null;
  shapePrimary: string | null;
  shapeSecondary: string | null;
  zones: string[];
  largeOpacity: string;
  pleuralPlaques: boolean;
  plaqueCalcification: boolean;
  diffuseThickening: boolean;
  costophrenicObliteration: string[];
  symbols: string[];
  result: PneumoconiosisResult | null;
  comment: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function initialValues(seed: {
  patient?: PatientListItem | null;
  protocolId?: string | null;
  reading?: PneumoconiosisReading | null;
}): PneumoFormValues {
  const r = seed.reading ?? null;
  const d = r ? new Date(r.readAt) : new Date();
  return {
    patient: seed.patient ?? null,
    protocolId: r?.protocolId ?? seed.protocolId ?? null,
    radiologyRequestId: r?.radiologyRequestId ?? null,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    readerRole: r?.readerRole ?? '',
    filmDate: r?.filmDate ? r.filmDate.slice(0, 10) : '',
    filmQuality: r?.filmQuality ?? null,
    qualityComment: r?.qualityComment ?? '',
    profusion: r?.profusion ?? null,
    shapePrimary: r?.shapePrimary ?? null,
    shapeSecondary: r?.shapeSecondary ?? null,
    zones: r?.zones ?? [],
    largeOpacity: r?.largeOpacity ?? '0',
    pleuralPlaques: r?.pleuralPlaques ?? false,
    plaqueCalcification: r?.plaqueCalcification ?? false,
    diffuseThickening: r?.diffuseThickening ?? false,
    costophrenicObliteration: r?.costophrenicObliteration ?? [],
    symbols: r?.symbols ?? [],
    result: r?.result ?? null,
    comment: r?.comment ?? '',
  };
}

/** Unreadable films carry no classification, so the analysis ignores what was typed before quality 4 was chosen. */
export function classification(v: PneumoFormValues) {
  const unreadable = v.filmQuality === 4;
  return {
    filmQuality: v.filmQuality,
    profusion: unreadable ? null : v.profusion,
    shapePrimary: unreadable ? null : v.shapePrimary,
    shapeSecondary: unreadable ? null : v.shapeSecondary,
    zones: unreadable ? [] : v.zones,
    largeOpacity: unreadable ? '0' : v.largeOpacity,
    pleuralPlaques: v.pleuralPlaques,
    plaqueCalcification: v.pleuralPlaques && v.plaqueCalcification,
    diffuseThickening: v.diffuseThickening,
    costophrenicObliteration: v.costophrenicObliteration,
    symbols: v.symbols,
  };
}

export function analyze(v: PneumoFormValues) {
  return analyzePneumoconiosis(classification(v));
}

/** Unreadable films need no classification; otherwise profusion (and a shape when opacities exist) is required. */
export function formErrors(v: PneumoFormValues): string[] {
  if (v.filmQuality === 4) return [];
  const errors: string[] = [];
  if (!v.profusion) errors.push('profusion');
  else if (v.profusion !== '0/-' && v.profusion !== '0/0' && !v.shapePrimary)
    errors.push('shapePrimary');
  return errors;
}

export function toInput(v: PneumoFormValues): PneumoconiosisInput {
  return {
    employeeId: v.patient!.id,
    protocolId: v.protocolId,
    radiologyRequestId: v.radiologyRequestId,
    readAt: new Date(`${v.date}T${v.time || '00:00'}:00`).toISOString(),
    readerRole: v.readerRole.trim() || null,
    filmDate: v.filmDate || null,
    qualityComment: v.qualityComment.trim() || null,
    ...classification(v),
    result: v.result ?? analyze(v).suggested,
    comment: v.comment.trim() || null,
  };
}
