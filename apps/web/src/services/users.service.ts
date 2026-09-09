import type { PaginatedResult, Permission } from '@osgb/shared-types';
import type { CreateUserInput, Role, RoleInput, StaffUser, UpdateUserInput } from '@/types/user';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const usersService = {
  async list(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<StaffUser>> {
    return toPaginated(await apiClient.get('/users', { params: query }));
  },
  async get(id: string): Promise<StaffUser> {
    return unwrap(await apiClient.get(`/users/${id}`));
  },
  async create(input: CreateUserInput): Promise<StaffUser> {
    return unwrap(await apiClient.post('/users', input));
  },
  async update(id: string, input: UpdateUserInput): Promise<StaffUser> {
    return unwrap(await apiClient.patch(`/users/${id}`, input));
  },
  async assignRoles(id: string, roleIds: string[]): Promise<StaffUser> {
    return unwrap(await apiClient.put(`/users/${id}/roles`, { roleIds }));
  },
  async setPassword(id: string, password: string): Promise<{ revokedSessions: number }> {
    return unwrap(await apiClient.put(`/users/${id}/password`, { password }));
  },
};

export const rolesService = {
  async list(): Promise<Role[]> {
    return unwrap(await apiClient.get('/roles'));
  },
  async create(input: RoleInput): Promise<Role> {
    return unwrap(await apiClient.post('/roles', input));
  },
  async update(id: string, input: Pick<RoleInput, 'name' | 'description'>): Promise<Role> {
    return unwrap(await apiClient.patch(`/roles/${id}`, input));
  },
  async setPermissions(id: string, permissions: Permission[]): Promise<Role> {
    return unwrap(await apiClient.put(`/roles/${id}/permissions`, { permissions }));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },
};
