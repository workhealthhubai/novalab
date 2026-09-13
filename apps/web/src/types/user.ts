import type { Permission, UserStatus } from '@osgb/shared-types';

export interface RoleRef {
  id: string;
  name: string;
}

export interface StaffUser {
  id: string;
  companyId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: Array<{ role: RoleRef }>;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  companyId?: string | null;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}

export interface UpdateUserInput {
  companyId?: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions?: Permission[];
}
