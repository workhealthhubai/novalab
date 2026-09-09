import type {
  ExaminationType,
  ProtocolItemStatus,
  ProtocolItemType,
  ProtocolStatus,
} from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const PROTOCOL_TYPE_LABELS: Record<ExaminationType, string> = {
  PRE_EMPLOYMENT: 'İşe Giriş',
  PERIODIC: 'Periyodik',
  RETURN_TO_WORK: 'İşe Dönüş',
  EXIT: 'İşten Ayrılış',
  SPECIAL: 'Erken Kontrol / Özel',
};

/** One entry per doctor-module screen, in sidebar order. */
export const PROTOCOL_ITEM_LABELS: Record<ProtocolItemType, string> = {
  RADIOLOGY: 'Radyoloji',
  AUDIOMETRY: 'Odyometri',
  ECG: 'EKG',
  SPIROMETRY: 'SFT',
  EYE: 'Göz',
  PNEUMOCONIOSIS: 'Pnömokonyoz',
  LAB: 'Lab. Tahlilleri',
  HEALTH_REPORT: 'Sağlık Raporu',
  ISG_REPORT: 'İSG Raporu',
};

export const PROTOCOL_ITEM_TYPES = Object.keys(PROTOCOL_ITEM_LABELS) as ProtocolItemType[];

export const PROTOCOL_STATUS: Record<ProtocolStatus, { status: Status; label: string }> = {
  OPEN: { status: 'waiting', label: 'Açık' },
  IN_PROGRESS: { status: 'signed', label: 'Devam ediyor' },
  COMPLETED: { status: 'completed', label: 'Tamamlandı' },
  CANCELLED: { status: 'cancelled', label: 'İptal' },
};

export const PROTOCOL_ITEM_STATUS: Record<ProtocolItemStatus, { status: Status; label: string }> = {
  PENDING: { status: 'waiting', label: 'Bekliyor' },
  DONE: { status: 'completed', label: 'Tamamlandı' },
  CANCELLED: { status: 'cancelled', label: 'İptal' },
};

/** Default test set per visit reason (editable in the dialog). */
export const DEFAULT_ITEMS: Record<ExaminationType, ProtocolItemType[]> = {
  PRE_EMPLOYMENT: ['LAB', 'RADIOLOGY', 'AUDIOMETRY', 'SPIROMETRY', 'EYE', 'HEALTH_REPORT'],
  PERIODIC: ['LAB', 'RADIOLOGY', 'AUDIOMETRY', 'SPIROMETRY', 'HEALTH_REPORT'],
  RETURN_TO_WORK: ['HEALTH_REPORT'],
  EXIT: ['HEALTH_REPORT'],
  SPECIAL: [],
};

export function isProtocolEditable(status: ProtocolStatus): boolean {
  return status === 'OPEN' || status === 'IN_PROGRESS';
}
