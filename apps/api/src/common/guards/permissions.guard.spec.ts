import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS } from '@osgb/shared-types';
import { CompanyScoped, CompanySelfAccess } from '../decorators/company-scoped.decorator';
import { RequirePermissions } from '../decorators';
import type { AuthenticatedUser } from '../interfaces';
import { PermissionsGuard } from './permissions.guard';

class Routes {
  @CompanyScoped() @RequirePermissions(PERMISSIONS.EMPLOYEES_READ) scoped() {}
  @CompanySelfAccess() me() {}
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ) unscoped() {}
  noPermissionMetadata() {}
}
const actor: AuthenticatedUser = {
  id: 'u',
  tenantId: 't',
  email: 'test@example.test',
  firstName: 'T',
  lastName: 'U',
  status: 'ACTIVE',
  roles: ['company_representative'],
  permissions: [PERMISSIONS.EMPLOYEES_READ],
  companyId: 'a',
  companyAccessActive: true,
};
const guard = new PermissionsGuard(new Reflector());
function check(route: keyof Routes, user = actor) {
  return guard.canActivate({
    getHandler: () => Routes.prototype[route],
    getClass: () => Routes,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext);
}
describe('company endpoint authorization', () => {
  it('requires explicit company scoping even on handlers without permission metadata', () => {
    expect(() => check('unscoped')).toThrow(ForbiddenException);
    expect(() => check('noPermissionMetadata')).toThrow(ForbiddenException);
  });
  it('allows only scoped data reads and self-profile access', () => {
    expect(check('scoped')).toBe(true);
    expect(check('me', { ...actor, companyId: null })).toBe(true);
    expect(() => check('scoped', { ...actor, companyId: null })).toThrow(ForbiddenException);
  });
  it('still checks the permission after checking the company boundary', () => {
    expect(() => check('scoped', { ...actor, permissions: [] })).toThrow(ForbiddenException);
  });
  it('does not restrict internal roles to the portal allowlist', () => {
    expect(check('unscoped', { ...actor, roles: ['tenant_admin'], companyId: null })).toBe(true);
  });
});
