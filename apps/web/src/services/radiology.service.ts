import type { PaginatedResult } from '@osgb/shared-types';
import type {
  CreateRadiologyRequestInput,
  IncomingStudy,
  PacsOperationsStatus,
  RadiologyListQuery,
  RadiologyRequest,
  RadiologyRequestListItem,
  StudySummary,
  ViewerSession,
} from '@/types/radiology';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const radiologyService = {
  async list(query: RadiologyListQuery = {}): Promise<PaginatedResult<RadiologyRequestListItem>> {
    return toPaginated(await apiClient.get('/radiology', { params: query }));
  },
  async get(id: string): Promise<RadiologyRequest> {
    return unwrap(await apiClient.get(`/radiology/${id}`));
  },
  async create(input: CreateRadiologyRequestInput): Promise<RadiologyRequest> {
    return unwrap(await apiClient.post('/radiology', input));
  },
  async cancel(id: string): Promise<RadiologyRequest> {
    return unwrap(await apiClient.post(`/radiology/${id}/cancel`));
  },
  async retryWorklist(id: string): Promise<RadiologyRequest> {
    return unwrap(await apiClient.post(`/radiology/${id}/worklist`));
  },
  async linkStudy(id: string, studyInstanceUid: string): Promise<RadiologyRequest> {
    return unwrap(await apiClient.patch(`/radiology/${id}/link-study`, { studyInstanceUid }));
  },
  async report(id: string, reportText: string): Promise<RadiologyRequest> {
    return unwrap(await apiClient.post(`/radiology/${id}/report`, { reportText }));
  },
  async study(id: string): Promise<StudySummary | null> {
    return unwrap(await apiClient.get(`/radiology/${id}/study`));
  },
  async candidates(id: string): Promise<StudySummary[]> {
    return unwrap(await apiClient.get(`/radiology/${id}/pacs-candidates`));
  },
  async unlinked(limit = 25): Promise<IncomingStudy[]> {
    return unwrap(await apiClient.get('/radiology/pacs/unlinked', { params: { limit } }));
  },
  async operationsStatus(): Promise<PacsOperationsStatus> {
    return unwrap(await apiClient.get('/radiology/pacs/operations'));
  },
  async reconcile(limit = 25): Promise<{
    checked: number;
    linked: number;
    ambiguous: number;
    waiting: number;
  }> {
    return unwrap(
      await apiClient.post('/radiology/pacs/reconcile', undefined, { params: { limit } }),
    );
  },
  /** Sets the short-lived DICOMweb cookie and returns the OHIF URL to open. */
  async viewerSession(id: string): Promise<ViewerSession> {
    return unwrap(await apiClient.post(`/radiology/${id}/viewer-session`));
  },
  /** PNG rendered by Orthanc, proxied by the API (needs the bearer token, hence a blob). */
  async preview(id: string): Promise<Blob | null> {
    const response = await apiClient.get<Blob>(`/radiology/${id}/preview`, {
      responseType: 'blob',
      validateStatus: (status) => status === 200 || status === 404,
    });
    return response.status === 200 ? response.data : null;
  },
};
