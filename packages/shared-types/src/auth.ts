import type { Permission } from './permissions.js';
import type { UserStatus } from './enums.js';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

/** The authenticated principal as exposed to clients. Never includes passwordHash. */
export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  companyId?: string | null;
  companyAccessActive?: boolean;
  roles: string[];
  permissions: Permission[];
  isSuperAdmin?: boolean;
  /** Home tenant of the user when acting in another tenant via super admin switch. */
  originalTenantId?: string;
  /** Name of the active tenant when switched. */
  activeTenantName?: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface SwitchTenantRequest {
  targetTenantId: string;
}
