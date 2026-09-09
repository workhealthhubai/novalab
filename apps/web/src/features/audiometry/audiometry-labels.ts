import type { HearingGradeKey } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';
import type { AnalysisFlag } from '@/types/audiometry';

export const GRADE_STATUS: Record<HearingGradeKey, Status> = {
  NORMAL: 'completed',
  MILD: 'waiting',
  MODERATE: 'waiting',
  MODERATELY_SEVERE: 'cancelled',
  SEVERE: 'cancelled',
  PROFOUND: 'cancelled',
};

export const FLAG_LABELS: Record<AnalysisFlag, { label: string; description: string }> = {
  STS_BASELINE: {
    label: 'Eşik kayması (başlangıca göre)',
    description: '2–4 kHz ortalamasında başlangıç testine göre ≥ 10 dB kötüleşme (STS).',
  },
  STS_PREVIOUS: {
    label: 'Eşik kayması (önceki teste göre)',
    description: '2–4 kHz ortalamasında bir önceki teste göre ≥ 10 dB kötüleşme.',
  },
  NOISE_NOTCH: {
    label: 'Gürültü çentiği',
    description:
      '3–6 kHz aralığında komşu frekanslardan ≥ 10 dB derin çentik; gürültüye bağlı işitme kaybı lehine.',
  },
  ASYMMETRY: {
    label: 'Asimetri',
    description:
      'Kulaklar arası dört frekans ortalaması farkı ≥ 15 dB; ileri değerlendirme önerilir.',
  },
};

export function testPath(id: string): string {
  return PATHS.audiometryTest.replace(':testId', id);
}

export function newTestPath(params: { patientId?: string; protocolId?: string } = {}): string {
  const search = new URLSearchParams();
  if (params.patientId) search.set('patientId', params.patientId);
  if (params.protocolId) search.set('protocolId', params.protocolId);
  const query = search.toString();
  return query ? `${PATHS.audiometryNew}?${query}` : PATHS.audiometryNew;
}

export function formatDb(value: number | null | undefined): string {
  return value === null || value === undefined
    ? '—'
    : `${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} dB`;
}

export function formatShift(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const text = Math.abs(value).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  return value > 0 ? `+${text} dB` : value < 0 ? `−${text} dB` : '0 dB';
}
