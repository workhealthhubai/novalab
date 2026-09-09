import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { physiciansService } from '@/services/physicians.service';
import type { PhysicianInput, PhysicianListQuery } from '@/types/physician';

export const physicianKeys = {
  all: ['physicians'] as const,
  list: (query: PhysicianListQuery) => ['physicians', 'list', query] as const,
  signature: (id: string, version: string | null) =>
    ['physicians', 'signature', id, version] as const,
};

export function usePhysicians(query: PhysicianListQuery) {
  return useQuery({
    queryKey: physicianKeys.list(query),
    queryFn: () => physiciansService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function usePhysicianSignature(id: string | undefined, version: string | null | undefined) {
  return useQuery({
    queryKey: physicianKeys.signature(id ?? '', version ?? null),
    queryFn: () => physiciansService.signature(id!),
    enabled: Boolean(id) && Boolean(version),
    staleTime: Infinity,
  });
}

export function usePhysicianMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: physicianKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: PhysicianInput) => physiciansService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<PhysicianInput> }) =>
        physiciansService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => physiciansService.remove(id),
      onSuccess: invalidate,
    }),
    setSignature: useMutation({
      mutationFn: ({ id, file }: { id: string; file: Blob }) =>
        physiciansService.setSignature(id, file),
      onSuccess: invalidate,
    }),
    removeSignature: useMutation({
      mutationFn: (id: string) => physiciansService.removeSignature(id),
      onSuccess: invalidate,
    }),
  };
}
