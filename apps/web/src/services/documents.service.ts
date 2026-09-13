import type { PaginatedResult } from '@osgb/shared-types';
import { toPaginated } from './list';
import { apiClient, unwrap } from './api-client';

export interface TrackedDocument {
  id: string;
  fileName: string;
  category: string;
  companyId: string | null;
  expiresAt: string | null;
  isMedical: boolean;
}
export const documentsService = {
  async list(query: {
    page: number;
    pageSize: number;
    expiry: string;
    companyId?: string;
  }): Promise<PaginatedResult<TrackedDocument>> {
    return toPaginated(await apiClient.get('/documents', { params: query }));
  },
  async upload(form: FormData): Promise<TrackedDocument> {
    return unwrap(await apiClient.post('/documents', form));
  },
  async updateExpiry(id: string, expiresAt: string | null): Promise<TrackedDocument> {
    return unwrap(await apiClient.patch(`/documents/${id}/expiry`, { expiresAt }));
  },

  /** Short-lived presigned link; open it right away. */
  async downloadUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/documents/${id}/download-url`));
  },
};
