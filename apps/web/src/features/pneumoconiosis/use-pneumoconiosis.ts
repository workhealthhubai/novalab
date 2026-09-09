import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { pneumoconiosisService } from '@/services/pneumoconiosis.service';
import type {
  PneumoconiosisInput,
  PneumoconiosisListQuery,
  PneumoconiosisUpdateInput,
} from '@/types/pneumoconiosis';

export const pneumoKeys = {
  all: ['pneumoconiosis'] as const,
  list: (query: PneumoconiosisListQuery) => ['pneumoconiosis', 'list', query] as const,
  detail: (id: string) => ['pneumoconiosis', 'detail', id] as const,
  history: (employeeId: string) => ['pneumoconiosis', 'history', employeeId] as const,
};

export function usePneumoReadings(query: PneumoconiosisListQuery) {
  return useQuery({
    queryKey: pneumoKeys.list(query),
    queryFn: () => pneumoconiosisService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function usePneumoReading(id: string | undefined) {
  return useQuery({
    queryKey: pneumoKeys.detail(id ?? ''),
    queryFn: () => pneumoconiosisService.get(id!),
    enabled: Boolean(id),
  });
}

export function usePneumoHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: pneumoKeys.history(employeeId ?? ''),
    queryFn: () => pneumoconiosisService.history(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function usePneumoMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: pneumoKeys.all });
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
  };
  return {
    create: useMutation({
      mutationFn: (input: PneumoconiosisInput) => pneumoconiosisService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: PneumoconiosisUpdateInput }) =>
        pneumoconiosisService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => pneumoconiosisService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
