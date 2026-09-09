import type { PaginatedResult } from '@osgb/shared-types';
import type {
  EyeExamination,
  EyeHistoryPoint,
  EyeInput,
  EyeListQuery,
  EyeUpdateInput,
} from '@/types/eye';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const eyeService = {
  async list(query: EyeListQuery = {}): Promise<PaginatedResult<EyeExamination>> {
    return toPaginated(await apiClient.get('/eye', { params: query }));
  },
  async get(id: string): Promise<EyeExamination> {
    return unwrap(await apiClient.get(`/eye/${id}`));
  },
  async history(employeeId: string): Promise<EyeHistoryPoint[]> {
    return unwrap(await apiClient.get(`/eye/patients/${employeeId}/history`));
  },
  async create(input: EyeInput): Promise<EyeExamination> {
    return unwrap(await apiClient.post('/eye', input));
  },
  async update(id: string, input: EyeUpdateInput): Promise<EyeExamination> {
    return unwrap(await apiClient.patch(`/eye/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/eye/${id}`);
  },
};
