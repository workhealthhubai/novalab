import type { PaginatedResult } from '@osgb/shared-types';
import type {
  EcgHistoryPoint,
  EcgInput,
  EcgListQuery,
  EcgRecord,
  EcgUpdateInput,
} from '@/types/ecg';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const ecgService = {
  async list(query: EcgListQuery = {}): Promise<PaginatedResult<EcgRecord>> {
    return toPaginated(await apiClient.get('/ecg', { params: query }));
  },
  async get(id: string): Promise<EcgRecord> {
    return unwrap(await apiClient.get(`/ecg/${id}`));
  },
  async history(employeeId: string): Promise<EcgHistoryPoint[]> {
    return unwrap(await apiClient.get(`/ecg/patients/${employeeId}/history`));
  },
  async create(input: EcgInput): Promise<EcgRecord> {
    return unwrap(await apiClient.post('/ecg', input));
  },
  async update(id: string, input: EcgUpdateInput): Promise<EcgRecord> {
    return unwrap(await apiClient.patch(`/ecg/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/ecg/${id}`);
  },
  async attachTrace(id: string, file: File): Promise<EcgRecord> {
    const form = new FormData();
    form.append('file', file);
    return unwrap(await apiClient.put(`/ecg/${id}/trace`, form, { timeout: 60_000 }));
  },
  async traceUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/ecg/${id}/trace-url`));
  },
};
