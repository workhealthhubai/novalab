import type { Permission } from '@osgb/shared-types';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth.store';

/** Permission-aware UI helpers backed by the current principal. The API remains the authority. */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  return {
    can: (permission: Permission) => hasPermission(user, permission),
    canAll: (permissions: readonly Permission[]) => hasAllPermissions(user, permissions),
    canAny: (permissions: readonly Permission[]) => hasAnyPermission(user, permissions),
    hasRole: (role: string) => Boolean(user?.roles.includes(role)),
    permissions: user?.permissions ?? [],
    roles: user?.roles ?? [],
  };
}

export function useCan(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  return hasPermission(user, permission);
}
