import {
  type ColorVisionResult,
  type EyeFlag,
  type EyeRecommendation,
  snellenLabel,
  type VisualFieldResult,
} from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';

export const RECOMMENDATION: Record<EyeRecommendation, { label: string; status: Status }> = {
  NONE: { label: 'Normal', status: 'completed' },
  GLASSES: { label: 'Gözlük önerisi', status: 'waiting' },
  REFERRAL: { label: 'Göz hekimine sevk', status: 'cancelled' },
};
export const RECOMMENDATIONS = Object.keys(RECOMMENDATION) as EyeRecommendation[];

export const COLOR_VISION_LABELS: Record<ColorVisionResult, string> = {
  NORMAL: 'Normal',
  DEFICIENT: 'Renk görme kusuru',
  NOT_TESTED: 'Bakılmadı',
};

export const VISUAL_FIELD_LABELS: Record<VisualFieldResult, string> = {
  NORMAL: 'Normal',
  ABNORMAL: 'Anormal',
  NOT_TESTED: 'Bakılmadı',
};

export const FLAG_LABELS: Record<EyeFlag, string> = {
  LOW_ACUITY_RIGHT: 'Sağ gözde düşük görme (en iyi < 0,8)',
  LOW_ACUITY_LEFT: 'Sol gözde düşük görme (en iyi < 0,8)',
  GLASSES_NEEDED: 'Düzeltmesiz görme düşük, düzeltmeli normal: gözlük gerekli',
  ASYMMETRY: 'Gözler arası fark ≥ 0,3',
  COLOR_DEFICIENCY: 'Renk görme kusuru',
  VISUAL_FIELD_ABNORMAL: 'Görme alanı anormal',
  NEAR_VISION_REDUCED: 'Yakın görme azalmış (J3 ve üzeri)',
};

export function eyePath(id: string): string {
  return PATHS.eyeExamination.replace(':examId', id);
}

export function newEyePath(params: { patientId?: string; protocolId?: string } = {}): string {
  const search = new URLSearchParams();
  if (params.patientId) search.set('patientId', params.patientId);
  if (params.protocolId) search.set('protocolId', params.protocolId);
  const query = search.toString();
  return query ? `${PATHS.eyeNew}?${query}` : PATHS.eyeNew;
}

/** "0,8 (6/7)" */
export function acuity(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = snellenLabel(value);
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}${s ? ` (${s})` : ''}`;
}

export function jaeger(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `J${value}`;
}
