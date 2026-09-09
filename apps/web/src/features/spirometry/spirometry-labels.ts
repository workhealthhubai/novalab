import type { SmokingStatus, SpirometryFlag, SpirometryPattern } from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';

export const PATTERN: Record<SpirometryPattern, { label: string; status: Status }> = {
  NORMAL: { label: 'Normal', status: 'completed' },
  OBSTRUCTIVE: { label: 'Obstrüktif', status: 'cancelled' },
  RESTRICTIVE: { label: 'Restriktif (öneri)', status: 'waiting' },
  MIXED: { label: 'Mikst', status: 'cancelled' },
};
export const PATTERNS = Object.keys(PATTERN) as SpirometryPattern[];

export const SMOKING_LABELS: Record<SmokingStatus, string> = {
  NEVER: 'Hiç içmemiş',
  FORMER: 'Bırakmış',
  CURRENT: 'İçiyor',
};
export const SMOKING = Object.keys(SMOKING_LABELS) as SmokingStatus[];

export const FLAG_LABELS: Record<SpirometryFlag, string> = {
  OBSTRUCTION: 'Obstrüksiyon (FEV1/FVC < %70)',
  RESTRICTION_SUGGESTED: 'Restriksiyon şüphesi (FVC < %80 beklenen)',
  MIXED: 'Mikst patern',
  LOW_PEF: 'Düşük PEF',
  BD_RESPONSE: 'Bronkodilatör yanıtı pozitif (≥ %12 ve ≥ 200 mL)',
  FEV1_DECLINE: 'Başlangıca göre FEV1 düşüşü ≥ %15',
  NO_PREDICTED: 'Beklenen değer yok (boy, doğum tarihi veya cinsiyet eksik)',
};

export function spirometryPath(id: string): string {
  return PATHS.spirometryTest.replace(':testId', id);
}

export function newSpirometryPath(
  params: { patientId?: string; protocolId?: string } = {},
): string {
  const search = new URLSearchParams();
  if (params.patientId) search.set('patientId', params.patientId);
  if (params.protocolId) search.set('protocolId', params.protocolId);
  const query = search.toString();
  return query ? `${PATHS.spirometryNew}?${query}` : PATHS.spirometryNew;
}

export function litres(value: number | null | undefined, unit = 'L'): string {
  return value === null || value === undefined
    ? '—'
    : `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
}

export function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `%${value}`;
}
