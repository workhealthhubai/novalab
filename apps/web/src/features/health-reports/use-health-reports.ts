import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { healthReportsService } from '@/services/health-reports.service';
import type { HealthReportListQuery, HealthReportUpdateInput } from '@/types/health-report';

export const reportKeys = {
  all: ['health-reports'] as const,
  list: (query: HealthReportListQuery) => ['health-reports', 'list', query] as const,
  detail: (id: string) => ['health-reports', 'detail', id] as const,
  patientSummary: (employeeId: string) =>
    ['health-reports', 'patient-summary', employeeId] as const,
};

export function useHealthReports(query: HealthReportListQuery) {
  return useQuery({
    queryKey: reportKeys.list(query),
    queryFn: () => healthReportsService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useHealthReport(id: string | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(id ?? ''),
    queryFn: () => healthReportsService.get(id!),
    enabled: Boolean(id),
  });
}

export function usePatientMedicalSummary(employeeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: reportKeys.patientSummary(employeeId ?? ''),
    queryFn: () => healthReportsService.patientSummary(employeeId!),
    enabled: Boolean(employeeId) && enabled,
  });
}

export function useHealthReportMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['examinations'] });
  };
  return {
    openForProtocol: useMutation({
      mutationFn: (protocolId: string) => healthReportsService.openForProtocol(protocolId),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: HealthReportUpdateInput }) =>
        healthReportsService.update(id, input),
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: (id: string) => healthReportsService.approve(id),
      onSuccess: invalidate,
    }),
  };
}

export async function openReportPdf(id: string): Promise<void> {
  const { url } = await healthReportsService.pdfUrl(id);
  window.open(url, '_blank', 'noopener');
}
