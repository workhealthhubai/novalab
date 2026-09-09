import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolKeys } from '@/features/protocols/use-protocols';
import { audiometryService } from '@/services/audiometry.service';
import type {
  AudiometryInput,
  AudiometryListQuery,
  AudiometryUpdateInput,
} from '@/types/audiometry';

export const audiometryKeys = {
  all: ['audiometry'] as const,
  list: (query: AudiometryListQuery) => ['audiometry', 'list', query] as const,
  detail: (id: string) => ['audiometry', 'detail', id] as const,
  history: (employeeId: string) => ['audiometry', 'history', employeeId] as const,
};

export function useAudiometryTests(query: AudiometryListQuery) {
  return useQuery({
    queryKey: audiometryKeys.list(query),
    queryFn: () => audiometryService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useAudiometryTest(id: string | undefined) {
  return useQuery({
    queryKey: audiometryKeys.detail(id ?? ''),
    queryFn: () => audiometryService.get(id!),
    enabled: Boolean(id),
  });
}

export function useAudiometryHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: audiometryKeys.history(employeeId ?? ''),
    queryFn: () => audiometryService.history(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useAudiometryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: audiometryKeys.all });
    // The save may complete the protocol's AUDIOMETRY item and mirror measurements.
    void queryClient.invalidateQueries({ queryKey: protocolKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['examinations'] });
  };
  return {
    create: useMutation({
      mutationFn: (input: AudiometryInput) => audiometryService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: AudiometryUpdateInput }) =>
        audiometryService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => audiometryService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
