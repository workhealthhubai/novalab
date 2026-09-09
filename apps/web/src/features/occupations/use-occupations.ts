import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { occupationsService } from '@/services/occupations.service';
import type { OccupationInput, OccupationListQuery } from '@/types/occupation';

export const occupationKeys = {
  all: ['occupations'] as const,
  list: (query: OccupationListQuery) => ['occupations', 'list', query] as const,
};

export function useOccupations(query: OccupationListQuery, enabled = true) {
  return useQuery({
    queryKey: occupationKeys.list(query),
    queryFn: () => occupationsService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useOccupationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: occupationKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: OccupationInput) => occupationsService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<OccupationInput> }) =>
        occupationsService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => occupationsService.remove(id),
      onSuccess: invalidate,
    }),
    importDefaults: useMutation({
      mutationFn: () => occupationsService.importDefaults(),
      onSuccess: invalidate,
    }),
  };
}
