import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';

const key = ['notifications'] as const;

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: () => notificationsService.list(),
    refetchInterval: 60_000,
  });
}

export function useNotificationMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  return {
    markRead: useMutation({
      mutationFn: (id: string) => notificationsService.markRead(id),
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: () => notificationsService.markAllRead(),
      onSuccess: invalidate,
    }),
  };
}
