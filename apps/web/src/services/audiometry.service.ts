import type { PaginatedResult } from '@osgb/shared-types';
import type {
  AudiometryHistoryPoint,
  AudiometryInput,
  AudiometryListQuery,
  AudiometryTest,
  AudiometryTestDetail,
  AudiometryUpdateInput,
} from '@/types/audiometry';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const audiometryService = {
  async list(query: AudiometryListQuery = {}): Promise<PaginatedResult<AudiometryTest>> {
    return toPaginated(await apiClient.get('/audiometry', { params: query }));
  },
  async get(id: string): Promise<AudiometryTestDetail> {
    return unwrap(await apiClient.get(`/audiometry/${id}`));
  },
  async history(employeeId: string): Promise<AudiometryHistoryPoint[]> {
    return unwrap(await apiClient.get(`/audiometry/patients/${employeeId}/history`));
  },
  async create(input: AudiometryInput): Promise<AudiometryTest> {
    return unwrap(await apiClient.post('/audiometry', input));
  },
  async update(id: string, input: AudiometryUpdateInput): Promise<AudiometryTest> {
    return unwrap(await apiClient.patch(`/audiometry/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/audiometry/${id}`);
  },
};
