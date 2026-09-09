import type { RadiologyModality, RadiologyRequestStatus } from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const MODALITY_LABELS: Record<RadiologyModality, string> = {
  CR: 'CR · Bilgisayarlı radyografi',
  DX: 'DX · Dijital radyografi',
  CT: 'BT',
  MR: 'MR',
  US: 'Ultrason',
  OT: 'Diğer',
};
export const MODALITIES = Object.keys(MODALITY_LABELS) as RadiologyModality[];

export const RADIOLOGY_STATUS: Record<RadiologyRequestStatus, { label: string; status: Status }> = {
  REQUESTED: { label: 'İstendi', status: 'waiting' },
  SCHEDULED: { label: 'Planlandı', status: 'waiting' },
  IN_PROGRESS: { label: 'Çekimde', status: 'waiting' },
  COMPLETED: { label: 'Görüntü alındı', status: 'completed' },
  REPORTED: { label: 'Raporlandı', status: 'signed' },
  CANCELLED: { label: 'İptal', status: 'cancelled' },
};
export const RADIOLOGY_STATUSES = Object.keys(RADIOLOGY_STATUS) as RadiologyRequestStatus[];

/** Common OSGB requests; free text is still allowed. */
export const BODY_PART_SUGGESTIONS = [
  'Akciğer PA',
  'Akciğer PA + Lateral',
  'Lomber vertebra',
  'Servikal vertebra',
  'Torakal vertebra',
  'El bileği',
  'Diz',
  'Omuz',
  'Ayak bileği',
];
