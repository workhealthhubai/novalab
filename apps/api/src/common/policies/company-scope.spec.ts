import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '../interfaces';
import { companyScope, scopedCompanyFilter } from './company-scope';
import { employeeVisibleTo } from '@/modules/employees/employee-notes.policy';
import { toAuthenticatedUser } from '@/modules/users/users.service';
import type { UserWithAccess } from '@/modules/users/users.repository';

export const companyActor: AuthenticatedUser = {
  id: 'user',
  tenantId: 'tenant',
  email: 'test@example.test',
  firstName: 'Test',
  lastName: 'User',
  status: 'ACTIVE',
  roles: ['company_representative'],
  permissions: [PERMISSIONS.EMPLOYEES_READ],
  companyId: 'company-a',
  companyAccessActive: true,
};

describe('company access boundary', () => {
  it('rejects unassigned and deleted-company accounts instead of falling back to tenant access', () => {
    expect(() => companyScope({ ...companyActor, companyId: null })).toThrow(ForbiddenException);
    expect(() => companyScope({ ...companyActor, companyAccessActive: false })).toThrow(
      ForbiddenException,
    );
  });
  it('forces the server-owned company and rejects a different query filter', () => {
    expect(scopedCompanyFilter(companyActor)).toBe('company-a');
    expect(scopedCompanyFilter(companyActor, 'company-a')).toBe('company-a');
    expect(() => scopedCompanyFilter(companyActor, 'company-b')).toThrow(NotFoundException);
  });
  it('does not let additional roles bypass a company assignment', () => {
    const actor = {
      ...companyActor,
      roles: ['tenant_admin'],
      permissions: [PERMISSIONS.EXAMINATIONS_READ],
    };
    expect(companyScope(actor)).toBe('company-a');
    expect(employeeVisibleTo(actor, { id: 'employee', notes: 'private medical note' })).toEqual({
      id: 'employee',
    });
  });
  it('retains internal employee filters without creating a company restriction', () => {
    const actor = { ...companyActor, roles: ['tenant_admin'], companyId: null };
    expect(companyScope(actor)).toBeUndefined();
    expect(scopedCompanyFilter(actor, 'company-b')).toBe('company-b');
  });
  it('clamps principal permissions even when an employer has a broad extra role', () => {
    const user = {
      ...companyActor,
      company: { id: 'company-a', deletedAt: null },
      userRoles: [
        {
          role: {
            name: 'tenant_admin',
            rolePermissions: [
              PERMISSIONS.EMPLOYEES_READ,
              PERMISSIONS.EXAMINATIONS_READ,
              PERMISSIONS.REPORTS_EXPORT,
              PERMISSIONS.USERS_UPDATE,
            ].map((key) => ({ permission: { key } })),
          },
        },
      ],
    } as unknown as UserWithAccess;
    expect(toAuthenticatedUser(user).permissions).toEqual([PERMISSIONS.EMPLOYEES_READ]);
  });
});
