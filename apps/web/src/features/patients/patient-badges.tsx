import type { EmployeeStatus } from '@osgb/shared-types';
import { StatusBadge, type Status } from '@/design-system/status-badge';

const EMPLOYEE: Record<EmployeeStatus, { status: Status; label: string }> = {
  ACTIVE: { status: 'completed', label: 'Aktif' },
  ON_LEAVE: { status: 'waiting', label: 'İzinli' },
  TERMINATED: { status: 'cancelled', label: 'Ayrıldı' },
};

export function EmployeeStatusBadge({ value }: { value: EmployeeStatus }) {
  return <StatusBadge status={EMPLOYEE[value].status} label={EMPLOYEE[value].label} />;
}

export const EMPLOYEE_STATUS_LABELS = EMPLOYEE;
