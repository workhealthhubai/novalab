import type { PaginatedResult } from '@osgb/shared-types';
import type {
  PneumoconiosisHistoryPoint,
  PneumoconiosisInput,
  PneumoconiosisListQuery,
  PneumoconiosisReading,
  PneumoconiosisReadingDetail,
  PneumoconiosisUpdateInput,
} from '@/types/pneumoconiosis';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const pneumoconiosisService = {
  async list(query: PneumoconiosisListQuery = {}): Promise<PaginatedResult<PneumoconiosisReading>> {
    return toPaginated(await apiClient.get('/pneumoconiosis', { params: query }));
  },
  async get(id: string): Promise<PneumoconiosisReadingDetail> {
    return unwrap(await apiClient.get(`/pneumoconiosis/${id}`));
  },
  async history(employeeId: string): Promise<PneumoconiosisHistoryPoint[]> {
    return unwrap(await apiClient.get(`/pneumoconiosis/patients/${employeeId}/history`));
  },
  async create(input: PneumoconiosisInput): Promise<PneumoconiosisReadingDetail> {
    return unwrap(await apiClient.post('/pneumoconiosis', input));
  },
  async update(id: string, input: PneumoconiosisUpdateInput): Promise<PneumoconiosisReadingDetail> {
    return unwrap(await apiClient.patch(`/pneumoconiosis/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/pneumoconiosis/${id}`);
  },
};
