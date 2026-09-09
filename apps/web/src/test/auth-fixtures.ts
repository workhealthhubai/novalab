import type { AuthUser, LoginResponse, Permission } from '@osgb/shared-types';
import { ALL_PERMISSIONS } from '@osgb/shared-types';
import { useAuthStore } from '@/stores/auth.store';

export const adminUser: AuthUser = {
  id: 'u-admin',
  tenantId: 't-demo',
  email: 'admin@demo.local',
  firstName: 'Demo',
  lastName: 'Admin',
  status: 'ACTIVE',
  roles: ['tenant_admin'],
  permissions: [...ALL_PERMISSIONS],
};

export function loginResponse(user: AuthUser = adminUser): LoginResponse {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
    tokenType: 'Bearer',
    user,
  };
}

/** Puts an authenticated principal into the store without touching the network. */
export function signInAs(user: AuthUser = adminUser, permissions?: Permission[]): void {
  const principal = permissions ? { ...user, permissions } : user;
  useAuthStore.getState().setSession(loginResponse(principal), principal, false);
}
