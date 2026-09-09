import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { spirometryService } from '@/services/spirometry.service';
import type {
  SpirometryInput,
  SpirometryListQuery,
  SpirometryUpdateInput,
} from '@/types/spirometry';

export const spirometryKeys = {
  all: ['spirometry'] as const,
  list: (query: SpirometryListQuery) => ['spirometry', 'list', query] as const,
  detail: (id: string) => ['spirometry', 'detail', id] as const,
  history: (employeeId: string) => ['spirometry', 'history', employeeId] as const,
};

export function useSpirometryTests(query: SpirometryListQuery) {
  return useQuery({
    queryKey: spirometryKeys.list(query),
    queryFn: () => spirometryService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useSpirometryTest(id: string | undefined) {
  return useQuery({
    queryKey: spirometryKeys.detail(id ?? ''),
    queryFn: () => spirometryService.get(id!),
    enabled: Boolean(id),
  });
}

export function useSpirometryHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: spirometryKeys.history(employeeId ?? ''),
    queryFn: () => spirometryService.history(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useSpirometryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: spirometryKeys.all });
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['examinations'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: SpirometryInput) => spirometryService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SpirometryUpdateInput }) =>
        spirometryService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => spirometryService.remove(id),
      onSuccess: invalidate,
    }),
    attachTrace: useMutation({
      mutationFn: ({ id, file }: { id: string; file: File }) =>
        spirometryService.attachTrace(id, file),
      onSuccess: invalidate,
    }),
  };
}

export async function openTrace(id: string): Promise<void> {
  const { url } = await spirometryService.traceUrl(id);
  window.open(url, '_blank', 'noopener');
}
