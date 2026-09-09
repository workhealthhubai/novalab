import type { TenantStatus } from '@osgb/shared-types';
import { apiClient, unwrap } from './api-client';

export interface CurrentTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
}

export const tenantsService = {
  async current(): Promise<CurrentTenant> {
    return unwrap(await apiClient.get('/tenants/current'));
  },
};
