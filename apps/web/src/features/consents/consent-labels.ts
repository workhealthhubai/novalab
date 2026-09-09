import type { ConsentMethod, ConsentStatus, ConsentType } from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  DISCLOSURE: 'Aydınlatma Metni',
  EXPLICIT_CONSENT: 'Açık Rıza',
  HEALTH_DATA: 'Sağlık Verisi Rızası',
  COMMUNICATION: 'İletişim İzni',
};
export const CONSENT_TYPES = Object.keys(CONSENT_TYPE_LABELS) as ConsentType[];

export const CONSENT_METHOD_LABELS: Record<ConsentMethod, string> = {
  PAPER: 'Islak imza (kâğıt)',
  SIGNATURE_PAD: 'Tablet / imza pedi',
  ELECTRONIC: 'Elektronik (e-posta / SMS onayı)',
  VERBAL: 'Sözlü beyan',
};

export const CONSENT_STATUS: Record<ConsentStatus, { label: string; status: Status }> = {
  GIVEN: { label: 'Verildi', status: 'completed' },
  WITHDRAWN: { label: 'Geri çekildi', status: 'cancelled' },
};

export const SUMMARY_STATE: Record<
  'CURRENT' | 'OUTDATED' | 'MISSING',
  { label: string; status: Status }
> = {
  CURRENT: { label: 'Güncel', status: 'completed' },
  OUTDATED: { label: 'Eski sürüm', status: 'waiting' },
  MISSING: { label: 'Alınmadı', status: 'cancelled' },
};
