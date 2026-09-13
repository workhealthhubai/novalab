import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SYSTEM_ROLES } from '@osgb/shared-types';
import type { AuthenticatedUser } from '../interfaces';

export function isCompanyAccount(actor: AuthenticatedUser): boolean {
  return Boolean(actor.companyId) || actor.roles.includes(SYSTEM_ROLES.COMPANY_REPRESENTATIVE);
}

export function companyScope(actor?: AuthenticatedUser): string | undefined {
  if (!actor || !isCompanyAccount(actor)) return undefined;
  if (!actor.companyId || !actor.companyAccessActive) {
    throw new ForbiddenException({
      message: 'Hesabınıza aktif bir firma atanmalıdır.',
      errorCode: 'COMPANY_SCOPE_REQUIRED',
    });
  }
  return actor.companyId;
}

export function scopedCompanyFilter(
  actor: AuthenticatedUser | undefined,
  requested?: string,
): string | undefined {
  const scope = companyScope(actor);
  if (scope && requested && scope !== requested) throw new NotFoundException('Company not found');
  return scope ?? requested;
}
