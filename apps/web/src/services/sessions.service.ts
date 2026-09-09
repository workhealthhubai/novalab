import type { ActiveSession } from '@/types/session';
import { apiClient, unwrap } from './api-client';

export const sessionsService = {
  async list(): Promise<ActiveSession[]> {
    return unwrap(await apiClient.get('/sessions'));
  },
  async revoke(id: string): Promise<void> {
    await apiClient.delete(`/sessions/${id}`);
  },
  async revokeAllForUser(userId: string): Promise<{ revoked: number }> {
    return unwrap(await apiClient.delete(`/sessions/users/${userId}`));
  },
};
