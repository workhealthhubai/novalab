import type { ExaminationStatus, FitnessDecision } from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const EXAMINATION_STATUS: Record<ExaminationStatus, { label: string; status: Status }> = {
  SCHEDULED: { label: 'Planlandı', status: 'waiting' },
  IN_PROGRESS: { label: 'Devam ediyor', status: 'waiting' },
  COMPLETED: { label: 'Tamamlandı', status: 'completed' },
  APPROVED: { label: 'Onaylandı', status: 'signed' },
  CANCELLED: { label: 'İptal', status: 'cancelled' },
};

export const FITNESS_DECISION: Record<FitnessDecision, { label: string; status: Status }> = {
  PENDING: { label: 'Karar bekliyor', status: 'waiting' },
  FIT: { label: 'Çalışabilir', status: 'completed' },
  FIT_WITH_RESTRICTIONS: { label: 'Kısıtlı çalışabilir', status: 'waiting' },
  UNFIT: { label: 'Çalışamaz', status: 'cancelled' },
};
