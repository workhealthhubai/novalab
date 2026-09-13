import type { PaginatedResult, TenantStatus } from '@osgb/shared-types';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export interface TenantItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, unknown> | null;
  _count?: {
    users?: number;
    companies?: number;
  };
}

export type CurrentTenant = TenantItem;

export interface CreateTenantPayload {
  name: string;
  slug: string;
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateTenantPayload {
  name?: string;
  slug?: string;
  status?: TenantStatus;
  settings?: Record<string, unknown>;
}

export const tenantsService = {
  async current(): Promise<TenantItem> {
    return unwrap(await apiClient.get('/tenants/current'));
  },

  async list(page = 1, pageSize = 20): Promise<PaginatedResult<TenantItem>> {
    return toPaginated(await apiClient.get('/tenants', { params: { page, pageSize } }));
  },


  async create(data: CreateTenantPayload): Promise<TenantItem> {
    return unwrap(await apiClient.post('/tenants', data));
  },

  async update(id: string, data: UpdateTenantPayload): Promise<TenantItem> {
    return unwrap(await apiClient.patch(`/tenants/${id}`, data));
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return unwrap(await apiClient.delete(`/tenants/${id}`));
  },
};

