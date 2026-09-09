import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@osgb/shared-types';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const PERMISSIONS_MODE_KEY = 'requiredPermissionsMode';

export type PermissionsMode = 'all' | 'any';

/**
 * Requires the caller to hold ALL listed permissions.
 * @example @RequirePermissions('employees.read')
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  applyPermissionMetadata(permissions, 'all');

/** Requires the caller to hold AT LEAST ONE of the listed permissions. */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  applyPermissionMetadata(permissions, 'any');

function applyPermissionMetadata(permissions: Permission[], mode: PermissionsMode) {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor): void => {
    SetMetadata(PERMISSIONS_KEY, permissions)(
      target,
      key as string,
      descriptor as PropertyDescriptor,
    );
    SetMetadata(PERMISSIONS_MODE_KEY, mode)(
      target,
      key as string,
      descriptor as PropertyDescriptor,
    );
  };
}
