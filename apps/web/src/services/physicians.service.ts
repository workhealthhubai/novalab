import type { PaginatedResult } from '@osgb/shared-types';
import type { Physician, PhysicianInput, PhysicianListQuery } from '@/types/physician';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const physiciansService = {
  async list(query: PhysicianListQuery = {}): Promise<PaginatedResult<Physician>> {
    return toPaginated(await apiClient.get('/physicians', { params: query }));
  },
  async create(input: PhysicianInput): Promise<Physician> {
    return unwrap(await apiClient.post('/physicians', input));
  },
  async update(id: string, input: Partial<PhysicianInput>): Promise<Physician> {
    return unwrap(await apiClient.patch(`/physicians/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/physicians/${id}`);
  },
  async setSignature(id: string, file: Blob): Promise<Physician> {
    const form = new FormData();
    form.append('signature', file, 'signature');
    return unwrap(await apiClient.put(`/physicians/${id}/signature`, form, { timeout: 60_000 }));
  },
  async signature(id: string): Promise<Blob | null> {
    const response = await apiClient.get<Blob>(`/physicians/${id}/signature`, {
      responseType: 'blob',
      validateStatus: (status) => status === 200 || status === 404,
    });
    return response.status === 200 ? response.data : null;
  },
  async removeSignature(id: string): Promise<void> {
    await apiClient.delete(`/physicians/${id}/signature`);
  },
};
