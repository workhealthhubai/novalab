import type { EcgFlag, EcgInterpretation, EcgRhythm } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';

export const RHYTHM_LABELS: Record<EcgRhythm, string> = {
  SINUS: 'Sinüs ritmi',
  SINUS_ARRHYTHMIA: 'Sinüs aritmisi',
  SINUS_BRADYCARDIA: 'Sinüs bradikardisi',
  SINUS_TACHYCARDIA: 'Sinüs taşikardisi',
  ATRIAL_FIBRILLATION: 'Atriyal fibrilasyon',
  ATRIAL_FLUTTER: 'Atriyal flutter',
  SUPRAVENTRICULAR_TACHYCARDIA: 'Supraventriküler taşikardi',
  PACED: 'Pace ritmi',
  OTHER: 'Diğer',
};
export const RHYTHMS = Object.keys(RHYTHM_LABELS) as EcgRhythm[];

export const INTERPRETATION: Record<EcgInterpretation, { label: string; status: Status }> = {
  NORMAL: { label: 'Normal', status: 'completed' },
  BORDERLINE: { label: 'Sınırda', status: 'waiting' },
  ABNORMAL: { label: 'Anormal', status: 'cancelled' },
};
export const INTERPRETATIONS = Object.keys(INTERPRETATION) as EcgInterpretation[];

export const FLAG_LABELS: Record<EcgFlag, string> = {
  BRADYCARDIA: 'Bradikardi (< 60/dk)',
  TACHYCARDIA: 'Taşikardi (> 100/dk)',
  SHORT_PR: 'Kısa PR (< 120 ms)',
  LONG_PR: 'Uzun PR (> 200 ms)',
  WIDE_QRS: 'Geniş QRS (≥ 120 ms)',
  LONG_QTC: 'Uzun QTc',
  MARKEDLY_LONG_QTC: 'Belirgin uzun QTc (≥ 500 ms)',
  LEFT_AXIS: 'Sol aks sapması',
  RIGHT_AXIS: 'Sağ aks sapması',
  EXTREME_AXIS: 'Aşırı aks sapması',
  NON_SINUS_RHYTHM: 'Sinüs dışı ritim',
};

export function ecgPath(id: string): string {
  return PATHS.ecgRecord.replace(':recordId', id);
}

export function newEcgPath(params: { patientId?: string; protocolId?: string } = {}): string {
  const search = new URLSearchParams();
  if (params.patientId) search.set('patientId', params.patientId);
  if (params.protocolId) search.set('protocolId', params.protocolId);
  const query = search.toString();
  return query ? `${PATHS.ecgNew}?${query}` : PATHS.ecgNew;
}

export function fmt(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? '—' : `${value} ${unit}`;
}
