import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { eyeService } from '@/services/eye.service';
import type { EyeInput, EyeListQuery, EyeUpdateInput } from '@/types/eye';

export const eyeKeys = {
  all: ['eye'] as const,
  list: (query: EyeListQuery) => ['eye', 'list', query] as const,
  detail: (id: string) => ['eye', 'detail', id] as const,
  history: (employeeId: string) => ['eye', 'history', employeeId] as const,
};

export function useEyeExaminations(query: EyeListQuery) {
  return useQuery({
    queryKey: eyeKeys.list(query),
    queryFn: () => eyeService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useEyeExamination(id: string | undefined) {
  return useQuery({
    queryKey: eyeKeys.detail(id ?? ''),
    queryFn: () => eyeService.get(id!),
    enabled: Boolean(id),
  });
}

export function useEyeHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: eyeKeys.history(employeeId ?? ''),
    queryFn: () => eyeService.history(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useEyeMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: eyeKeys.all });
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['examinations'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: EyeInput) => eyeService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: EyeUpdateInput }) =>
        eyeService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => eyeService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
