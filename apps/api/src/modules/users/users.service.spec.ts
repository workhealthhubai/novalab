import { PERMISSIONS, SYSTEM_ROLES } from '@osgb/shared-types';
import { toAuthenticatedUser } from './users.service';
import type { UserWithAccess } from './users.repository';

describe('toAuthenticatedUser', () => {
  const baseUser: UserWithAccess = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'test@demo.local',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hash',
    status: 'ACTIVE',
    isSuperAdmin: false,
    companyId: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    company: null,
    tenant: { id: 'tenant-1', status: 'ACTIVE', slug: 'demo' },
    userRoles: [
      {
        id: 'ur-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        roleId: 'role-1',
        createdAt: new Date(),
        role: {
          id: 'role-1',
          name: SYSTEM_ROLES.TENANT_ADMIN,
          tenantId: 'tenant-1',
          description: '',
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          rolePermissions: [
            {
              id: 'rp-1',
              createdAt: new Date(),
              roleId: 'role-1',
              permissionId: 'perm-1',
              permission: { key: PERMISSIONS.SYSTEM_MANAGE },
            },
          ],
        },
      },
    ],
  };

  it('excludes TENANTS_MANAGE for regular tenant admin (isSuperAdmin: false)', () => {
    const authUser = toAuthenticatedUser(baseUser);
    expect(authUser.isSuperAdmin).toBe(false);
    expect(authUser.permissions).toContain(PERMISSIONS.SYSTEM_MANAGE);
    expect(authUser.permissions).not.toContain(PERMISSIONS.TENANTS_MANAGE);
  });

  it('strips TENANTS_MANAGE if present in role for non-superadmin', () => {
    const userRole = baseUser.userRoles[0]!;
    const userWithSneakyPermission: UserWithAccess = {
      ...baseUser,
      userRoles: [
        {
          ...userRole,
          role: {
            ...userRole.role,
            rolePermissions: [
              {
                id: 'rp-2',
                createdAt: new Date(),
                roleId: 'role-1',
                permissionId: 'perm-2',
                permission: { key: PERMISSIONS.TENANTS_MANAGE },
              },
            ],
          },
        },
      ],
    };

    const authUser = toAuthenticatedUser(userWithSneakyPermission);
    expect(authUser.permissions).not.toContain(PERMISSIONS.TENANTS_MANAGE);
  });

  it('grants TENANTS_MANAGE when isSuperAdmin is true', () => {
    const superAdminUser: UserWithAccess = {
      ...baseUser,
      isSuperAdmin: true,
    };

    const authUser = toAuthenticatedUser(superAdminUser);
    expect(authUser.isSuperAdmin).toBe(true);
    expect(authUser.permissions).toContain(PERMISSIONS.TENANTS_MANAGE);
  });
});
