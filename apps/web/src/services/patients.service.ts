import type { PaginatedResult } from '@osgb/shared-types';
import type { Patient, PatientInput, PatientListItem, PatientListQuery } from '@/types/patient';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const patientsService = {
  async list(query: PatientListQuery = {}): Promise<PaginatedResult<PatientListItem>> {
    return toPaginated(await apiClient.get('/employees', { params: query }));
  },
  async get(id: string): Promise<Patient> {
    return unwrap(await apiClient.get(`/employees/${id}`));
  },
  async create(input: PatientInput): Promise<Patient> {
    return unwrap(await apiClient.post('/employees', input));
  },
  async update(id: string, input: Partial<PatientInput>): Promise<Patient> {
    return unwrap(await apiClient.patch(`/employees/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },
  /** Portrait: stored normalised (JPEG ≤ 800px) by the API. */
  async setPhoto(id: string, file: Blob): Promise<Patient> {
    const form = new FormData();
    form.append('photo', file, 'photo.jpg');
    return unwrap(await apiClient.put(`/employees/${id}/photo`, form, { timeout: 60_000 }));
  },
  /** Fetched through the authenticated client (no public URL exists for portraits); null when none. */
  async photo(id: string): Promise<Blob | null> {
    const response = await apiClient.get<Blob>(`/employees/${id}/photo`, {
      responseType: 'blob',
      validateStatus: (status) => status === 200 || status === 404,
    });
    return response.status === 200 ? response.data : null;
  },
  async removePhoto(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}/photo`);
  },
};
