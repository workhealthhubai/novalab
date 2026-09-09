import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS } from '@osgb/shared-types';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { PermissionsGuard } from './permissions.guard';

function createContext(
  user: AuthenticatedUser | undefined,
  metadata: Record<string, unknown>,
): ExecutionContext {
  const handler = () => undefined;
  const cls = class TestController {};
  for (const [key, value] of Object.entries(metadata)) {
    Reflect.defineMetadata(key, value, handler);
  }
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const baseUser: AuthenticatedUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'u@example.com',
  firstName: 'U',
  lastName: 'One',
  status: 'ACTIVE',
  roles: ['nurse'],
  permissions: [PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EXAMINATIONS_READ],
};

describe('PermissionsGuard', () => {
  const guard = new PermissionsGuard(new Reflector());

  it('allows handlers without permission metadata', () => {
    expect(guard.canActivate(createContext(baseUser, {}))).toBe(true);
  });

  it('allows when all required permissions are granted', () => {
    const ctx = createContext(baseUser, {
      [PERMISSIONS_KEY]: [PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EXAMINATIONS_READ],
      [PERMISSIONS_MODE_KEY]: 'all',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies when a required permission is missing and reports it', () => {
    const ctx = createContext(baseUser, {
      [PERMISSIONS_KEY]: [PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_CREATE],
      [PERMISSIONS_MODE_KEY]: 'all',
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (error) {
      const response = (error as ForbiddenException).getResponse() as {
        details: { missing: string[] };
      };
      expect(response.details.missing).toEqual([PERMISSIONS.EMPLOYEES_CREATE]);
    }
  });

  it('supports "any" mode', () => {
    const ctx = createContext(baseUser, {
      [PERMISSIONS_KEY]: [PERMISSIONS.SYSTEM_MANAGE, PERMISSIONS.EMPLOYEES_READ],
      [PERMISSIONS_MODE_KEY]: 'any',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('fails closed when there is no authenticated user', () => {
    const ctx = createContext(undefined, { [PERMISSIONS_KEY]: [PERMISSIONS.EMPLOYEES_READ] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
