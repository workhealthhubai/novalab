import {
  ILO_SYMBOLS,
  type PneumoconiosisFlag,
  type PneumoconiosisResult,
} from '@osgb/shared-types';
import { PATHS } from '@/app/router/navigation';
import type { Status } from '@/design-system/status-badge';

export const RESULT: Record<PneumoconiosisResult, { label: string; status: Status }> = {
  NEGATIVE: { label: 'Negatif', status: 'completed' },
  BORDERLINE: { label: 'Sınırda (0/1)', status: 'waiting' },
  POSITIVE: { label: 'Pozitif', status: 'cancelled' },
};
export const RESULTS = Object.keys(RESULT) as PneumoconiosisResult[];

export const SHAPE_LABELS: Record<string, string> = {
  p: 'p · yuvarlak ≤ 1,5 mm',
  q: 'q · yuvarlak ≤ 3 mm',
  r: 'r · yuvarlak ≤ 10 mm',
  s: 's · düzensiz ≤ 1,5 mm',
  t: 't · düzensiz ≤ 3 mm',
  u: 'u · düzensiz ≤ 10 mm',
};

export const LARGE_OPACITY_LABELS: Record<string, string> = {
  '0': 'Yok',
  A: 'A · ≤ 50 mm',
  B: 'B · > 50 mm, sağ üst zonu aşmaz',
  C: 'C · sağ üst zonu aşar',
};

export const FLAG_LABELS: Record<PneumoconiosisFlag, string> = {
  UNREADABLE: 'Film kalitesi kabul edilemez; sınıflama yapılamaz, tekrar çekim gerekir',
  SMALL_OPACITIES: 'Küçük opasite profüzyonu ≥ 1/0 (pnömokonyoz lehine)',
  LARGE_OPACITIES: 'Büyük opasite var (komplike pnömokonyoz)',
  PLEURAL_ABNORMALITY: 'Plevral anormallik (plak, kalınlaşma veya sinüs küntleşmesi)',
  SYMBOL_ALERT: 'Klinik takip gerektiren sembol',
  PROGRESSION: 'Önceki filme göre kategori artışı (ilerleme)',
};

export function symbolLabel(code: string): string {
  const def = ILO_SYMBOLS.find((s) => s.code === code);
  return def ? `${code} · ${def.label}` : code;
}

export function readingPath(id: string): string {
  return PATHS.pneumoconiosisReading.replace(':readingId', id);
}

export function newReadingPath(params: { patientId?: string; protocolId?: string } = {}): string {
  const search = new URLSearchParams();
  if (params.patientId) search.set('patientId', params.patientId);
  if (params.protocolId) search.set('protocolId', params.protocolId);
  const query = search.toString();
  return query ? `${PATHS.pneumoconiosisNew}?${query}` : PATHS.pneumoconiosisNew;
}
