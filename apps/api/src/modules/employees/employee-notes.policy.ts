import { ForbiddenException } from '@nestjs/common';
import { isCompanyAccount } from '@/common/policies/company-scope';
import { MEDICAL_PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';

export function canAccessEmployeeNotes(actor: AuthenticatedUser): boolean {
  return (
    !isCompanyAccount(actor) &&
    actor.permissions.some((permission) => MEDICAL_PERMISSIONS.includes(permission))
  );
}

export function assertCanWriteEmployeeNotes(actor: AuthenticatedUser, value: unknown): void {
  if (value === undefined || canAccessEmployeeNotes(actor)) return;
  throw new ForbiddenException({
    message: 'Medical permission is required to write patient notes',
    errorCode: 'MEDICAL_ACCESS_DENIED',
  });
}

export function employeeVisibleTo<T extends object>(actor: AuthenticatedUser, employee: T): T {
  if (canAccessEmployeeNotes(actor)) return employee;
  const safe = { ...employee } as T & { notes?: unknown };
  delete safe.notes;
  return safe;
}
