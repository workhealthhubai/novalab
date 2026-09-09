import { apiClient, unwrap } from './api-client';

export const documentsService = {
  /** Short-lived presigned link; open it right away. */
  async downloadUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/documents/${id}/download-url`));
  },
};
