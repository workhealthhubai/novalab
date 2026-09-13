import type { PaginatedResult } from '@osgb/shared-types';
import { apiClient } from './api-client';
import { toPaginated } from './list';
export interface WorkItem {
  id: string;
  title: string;
  description: string;
  reasons: string[];
  date: string;
  target: 'protocol' | 'report' | 'patient';
  targetId: string;
}
export type WorkCategory = 'pending' | 'reports' | 'missing';
export const workItemsService = {
  async list(category: WorkCategory, page: number): Promise<PaginatedResult<WorkItem>> {
    return toPaginated(
      await apiClient.get(`/work-items/${category}`, { params: { page, pageSize: 10 } }),
    );
  },
};
