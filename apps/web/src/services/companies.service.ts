import type { PaginatedResult } from '@osgb/shared-types';
import type { NamedRef } from '@/types/patient';
import { apiClient } from './api-client';
import { toPaginated } from './list';

export const companiesService = {
  async list(search?: string): Promise<PaginatedResult<NamedRef>> {
    return toPaginated(
      await apiClient.get('/companies', {
        params: { pageSize: 100, ...(search ? { search } : {}) },
      }),
    );
  },
};
