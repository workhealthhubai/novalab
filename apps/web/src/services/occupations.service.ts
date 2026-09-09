import type { PaginatedResult } from '@osgb/shared-types';
import type { Occupation, OccupationInput, OccupationListQuery } from '@/types/occupation';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const occupationsService = {
  async list(query: OccupationListQuery = {}): Promise<PaginatedResult<Occupation>> {
    return toPaginated(await apiClient.get('/occupations', { params: query }));
  },
  async create(input: OccupationInput): Promise<Occupation> {
    return unwrap(await apiClient.post('/occupations', input));
  },
  async update(id: string, input: Partial<OccupationInput>): Promise<Occupation> {
    return unwrap(await apiClient.patch(`/occupations/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/occupations/${id}`);
  },
  async importDefaults(): Promise<{ imported: number; skipped: number }> {
    return unwrap(await apiClient.post('/occupations/import-defaults'));
  },
};
