import type { PaginatedResult } from '@osgb/shared-types';
import type {
  SpirometryHistoryPoint,
  SpirometryInput,
  SpirometryListQuery,
  SpirometryTest,
  SpirometryTestDetail,
  SpirometryUpdateInput,
} from '@/types/spirometry';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const spirometryService = {
  async list(query: SpirometryListQuery = {}): Promise<PaginatedResult<SpirometryTest>> {
    return toPaginated(await apiClient.get('/spirometry', { params: query }));
  },
  async get(id: string): Promise<SpirometryTestDetail> {
    return unwrap(await apiClient.get(`/spirometry/${id}`));
  },
  async history(employeeId: string): Promise<SpirometryHistoryPoint[]> {
    return unwrap(await apiClient.get(`/spirometry/patients/${employeeId}/history`));
  },
  async create(input: SpirometryInput): Promise<SpirometryTestDetail> {
    return unwrap(await apiClient.post('/spirometry', input));
  },
  async update(id: string, input: SpirometryUpdateInput): Promise<SpirometryTestDetail> {
    return unwrap(await apiClient.patch(`/spirometry/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/spirometry/${id}`);
  },
  async attachTrace(id: string, file: File): Promise<SpirometryTestDetail> {
    const form = new FormData();
    form.append('file', file);
    return unwrap(await apiClient.put(`/spirometry/${id}/trace`, form, { timeout: 60_000 }));
  },
  async traceUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/spirometry/${id}/trace-url`));
  },
};
