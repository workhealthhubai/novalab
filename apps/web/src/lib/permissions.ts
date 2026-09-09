import type { Permission } from '@osgb/shared-types';

export interface PermissionHolder {
  permissions: readonly string[];
}

export function hasPermission(
  holder: PermissionHolder | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(holder?.permissions.includes(permission));
}

export function hasAllPermissions(
  holder: PermissionHolder | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return Boolean(holder) && permissions.every((p) => holder?.permissions.includes(p));
}

export function hasAnyPermission(
  holder: PermissionHolder | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return Boolean(holder) && permissions.some((p) => holder?.permissions.includes(p));
}
