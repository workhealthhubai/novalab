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
  /** Server-managed company scope; never supplied by query parameters. */
  companyId?: string | null;
  companyAccessActive?: boolean;
  roles: string[];
  permissions: Permission[];
  isSuperAdmin?: boolean;
  /** Home tenant of the user when acting in another tenant via super admin switch. */
  originalTenantId?: string;
  /** Name of the active tenant when switched. */
  activeTenantName?: string;
  /** Refresh session behind this access token (present on tokens issued after sessions were added). */
  sessionId?: string;
}

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  email: string;
  /** Refresh session id, so "current session" can be recognised in session lists. */
  sid?: string;
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
