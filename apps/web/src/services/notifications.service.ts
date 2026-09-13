import type { NotificationList } from '@/types/notification';
import { apiClient, unwrap } from './api-client';

export const notificationsService = {
  async list(): Promise<NotificationList> {
    return unwrap(await apiClient.get('/notifications'));
  },
  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<number> {
    return unwrap<{ updated: number }>(await apiClient.post('/notifications/read-all')).updated;
  },
};
