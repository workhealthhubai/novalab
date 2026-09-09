import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { examinationsService } from '@/services/examinations.service';
import type { MeasurementInput } from '@/types/examination';

export const examinationKeys = {
  all: ['examinations'] as const,
  timeline: (employeeId: string) => ['examinations', 'timeline', employeeId] as const,
  compare: (employeeId: string, ids: string[] | null) =>
    ['examinations', 'compare', employeeId, ids] as const,
};

export function useExaminationTimeline(employeeId: string | undefined) {
  return useQuery({
    queryKey: examinationKeys.timeline(employeeId ?? ''),
    queryFn: () => examinationsService.timeline(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useExaminationComparison(employeeId: string | undefined, ids: string[] | null) {
  return useQuery({
    queryKey: examinationKeys.compare(employeeId ?? '', ids),
    queryFn: () => examinationsService.compare(employeeId!, ids ?? undefined),
    enabled: Boolean(employeeId),
    placeholderData: keepPreviousData,
  });
}

export function useSetMeasurements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, measurements }: { id: string; measurements: MeasurementInput[] }) =>
      examinationsService.setMeasurements(id, measurements),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: examinationKeys.all }),
  });
}
