import type { PhysicianStatus } from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';

export const PHYSICIAN_STATUS: Record<PhysicianStatus, { label: string; status: Status }> = {
  ACTIVE: { label: 'Aktif', status: 'completed' },
  INACTIVE: { label: 'Pasif', status: 'cancelled' },
};

export const TITLES = ['Dr.', 'Uzm. Dr.', 'Op. Dr.', 'Doç. Dr.', 'Prof. Dr.', 'Dt.'];

/** Suggested branches; the field is free text so others can be typed. */
export const SPECIALTIES = [
  'İşyeri Hekimi',
  'Radyoloji',
  'Göğüs Hastalıkları',
  'Kulak Burun Boğaz',
  'Göz Hastalıkları',
  'İç Hastalıkları',
  'Kardiyoloji',
  'Nöroloji',
  'Psikiyatri',
  'Fizik Tedavi ve Rehabilitasyon',
  'Aile Hekimliği',
  'Halk Sağlığı',
];

export function physicianDisplayName(p: {
  title: string | null;
  firstName: string;
  lastName: string;
}): string {
  return [p.title, p.firstName, p.lastName].filter(Boolean).join(' ');
}
