import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '@/services/sessions.service';

export const sessionKeys = { all: ['sessions'] as const };

/** Polls every 30 s so the list follows sign-ins/outs without a manual refresh. */
export function useActiveSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: () => sessionsService.list(),
    refetchInterval: 30_000,
  });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: sessionKeys.all });
  return {
    revoke: useMutation({
      mutationFn: (id: string) => sessionsService.revoke(id),
      onSuccess: invalidate,
    }),
    revokeAll: useMutation({
      mutationFn: (userId: string) => sessionsService.revokeAllForUser(userId),
      onSuccess: invalidate,
    }),
  };
}
