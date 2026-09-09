import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { ecgService } from '@/services/ecg.service';
import type { EcgInput, EcgListQuery, EcgUpdateInput } from '@/types/ecg';

export const ecgKeys = {
  all: ['ecg'] as const,
  list: (query: EcgListQuery) => ['ecg', 'list', query] as const,
  detail: (id: string) => ['ecg', 'detail', id] as const,
  history: (employeeId: string) => ['ecg', 'history', employeeId] as const,
};

export function useEcgRecords(query: EcgListQuery) {
  return useQuery({
    queryKey: ecgKeys.list(query),
    queryFn: () => ecgService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useEcgRecord(id: string | undefined) {
  return useQuery({
    queryKey: ecgKeys.detail(id ?? ''),
    queryFn: () => ecgService.get(id!),
    enabled: Boolean(id),
  });
}

export function useEcgHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ecgKeys.history(employeeId ?? ''),
    queryFn: () => ecgService.history(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useEcgMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ecgKeys.all });
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['examinations'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: EcgInput) => ecgService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: EcgUpdateInput }) =>
        ecgService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => ecgService.remove(id),
      onSuccess: invalidate,
    }),
    attachTrace: useMutation({
      mutationFn: ({ id, file }: { id: string; file: File }) => ecgService.attachTrace(id, file),
      onSuccess: invalidate,
    }),
  };
}

/** Opens the printout via its short-lived link. */
export async function openTrace(id: string): Promise<void> {
  const { url } = await ecgService.traceUrl(id);
  window.open(url, '_blank', 'noopener');
}
