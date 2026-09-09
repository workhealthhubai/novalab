import type { ConsentType, PaginatedResult } from '@osgb/shared-types';
import type {
  ConsentListQuery,
  ConsentSummaryItem,
  ConsentTemplate,
  GiveConsentInput,
  PatientConsent,
  PublishTemplateInput,
} from '@/types/consent';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const consentsService = {
  async templates(
    query: { type?: ConsentType; activeOnly?: boolean } = {},
  ): Promise<ConsentTemplate[]> {
    return unwrap(await apiClient.get('/consents/templates', { params: query }));
  },
  async publishTemplate(input: PublishTemplateInput): Promise<ConsentTemplate> {
    return unwrap(await apiClient.post('/consents/templates', input));
  },
  async importDefaults(): Promise<{ imported: ConsentType[]; skipped: ConsentType[] }> {
    return unwrap(await apiClient.post('/consents/templates/import-defaults'));
  },
  async list(query: ConsentListQuery = {}): Promise<PaginatedResult<PatientConsent>> {
    return toPaginated(await apiClient.get('/consents', { params: query }));
  },
  async summary(employeeId: string): Promise<ConsentSummaryItem[]> {
    return unwrap(await apiClient.get(`/consents/patients/${employeeId}/summary`));
  },
  async give(input: GiveConsentInput): Promise<PatientConsent> {
    return unwrap(await apiClient.post('/consents', input));
  },
  async withdraw(id: string, reason?: string | null): Promise<PatientConsent> {
    return unwrap(await apiClient.post(`/consents/${id}/withdraw`, { reason: reason ?? null }));
  },
};
