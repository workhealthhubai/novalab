import type { PaginatedResult } from '@osgb/shared-types';
import type {
  ActivityEntry,
  ActivityQuery,
  ActivitySummaryRow,
  AuditEntry,
  AuditQuery,
} from '@/types/audit';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const auditService = {
  async list(query: AuditQuery = {}): Promise<PaginatedResult<AuditEntry>> {
    return toPaginated(await apiClient.get('/audit', { params: query }));
  },
  async activity(query: ActivityQuery = {}): Promise<PaginatedResult<ActivityEntry>> {
    return toPaginated(await apiClient.get('/audit/activity', { params: query }));
  },
  async activitySummary(query: { from?: string; to?: string } = {}): Promise<ActivitySummaryRow[]> {
    return unwrap(await apiClient.get('/audit/activity/summary', { params: query }));
  },
};
