import type { HazardClass } from '@osgb/shared-types';
import type { Status } from '@/design-system/status-badge';
import { PATHS } from '@/app/router/navigation';

/** 6331 sayılı kanun tehlike sınıfları. */
export const HAZARD_CLASS: Record<HazardClass, { label: string; status: Status }> = {
  LESS_HAZARDOUS: { label: 'Az Tehlikeli', status: 'completed' },
  HAZARDOUS: { label: 'Tehlikeli', status: 'waiting' },
  VERY_HAZARDOUS: { label: 'Çok Tehlikeli', status: 'cancelled' },
};

export const HAZARD_CLASSES = Object.keys(HAZARD_CLASS) as HazardClass[];

export function companyPath(id: string): string {
  return PATHS.companyDetail.replace(':companyId', id);
}
