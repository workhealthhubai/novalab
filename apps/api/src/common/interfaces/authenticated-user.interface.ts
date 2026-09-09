import type { Permission, UserStatus } from '@osgb/shared-types';

/**
 * The principal attached to `request.user` after JWT validation.
 * `tenantId` is the ONLY trusted source of the active tenant.
 */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  permissions: Permission[];
}

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tid: string;
  /** Refresh session id */
  sid: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
