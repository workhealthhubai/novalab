import type { PaginatedResult } from '@osgb/shared-types';
import type {
  ConsentFormText,
  DocumentSignature,
  SignatureListQuery,
  SignatureVerification,
  SignConsentInput,
  SignUploadInput,
} from '@/types/signature';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const signaturesService = {
  async list(query: SignatureListQuery = {}): Promise<PaginatedResult<DocumentSignature>> {
    return toPaginated(await apiClient.get('/signatures', { params: query }));
  },
  async consentForm(templateId: string): Promise<ConsentFormText> {
    return unwrap(await apiClient.get(`/signatures/consent-forms/${templateId}`));
  },
  async signConsent(input: SignConsentInput): Promise<DocumentSignature> {
    return unwrap(await apiClient.post('/signatures/consents', input));
  },
  async signUpload(input: SignUploadInput): Promise<DocumentSignature> {
    const form = new FormData();
    form.append('file', input.file);
    form.append('employeeId', input.employeeId);
    form.append('title', input.title);
    if (input.signerName) form.append('signerName', input.signerName);
    form.append('signature', input.signature);
    return unwrap(await apiClient.post('/signatures/documents', form));
  },
  async downloadUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    return unwrap(await apiClient.get(`/signatures/${id}/download-url`));
  },
  async verify(id: string): Promise<SignatureVerification> {
    return unwrap(await apiClient.get(`/signatures/${id}/verify`));
  },
};
