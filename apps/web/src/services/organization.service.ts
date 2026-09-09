import type { Organization, OrganizationInput } from '@/types/organization';
import { apiClient, unwrap } from './api-client';

export const organizationService = {
  async get(): Promise<Organization> {
    return unwrap(await apiClient.get('/organization'));
  },
  async update(input: OrganizationInput): Promise<Organization> {
    return unwrap(await apiClient.put('/organization', input));
  },
  async setLogo(file: Blob): Promise<Organization> {
    const form = new FormData();
    form.append('logo', file, 'logo');
    return unwrap(await apiClient.put('/organization/logo', form, { timeout: 60_000 }));
  },
  async logo(): Promise<Blob | null> {
    const response = await apiClient.get<Blob>('/organization/logo', {
      responseType: 'blob',
      validateStatus: (status) => status === 200 || status === 404,
    });
    return response.status === 200 ? response.data : null;
  },
  async removeLogo(): Promise<void> {
    await apiClient.delete('/organization/logo');
  },
};
