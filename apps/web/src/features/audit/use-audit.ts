import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/audit.service';
import type { ActivityQuery, AuditQuery } from '@/types/audit';

export function useAuditLog(query: AuditQuery) {
  return useQuery({
    queryKey: ['audit', query] as const,
    queryFn: () => auditService.list(query),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useActivity(query: ActivityQuery) {
  return useQuery({
    queryKey: ['audit', 'activity', query] as const,
    queryFn: () => auditService.activity(query),
    placeholderData: keepPreviousData,
  });
}

export function useActivitySummary(query: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['audit', 'activity-summary', query] as const,
    queryFn: () => auditService.activitySummary(query),
  });
}
