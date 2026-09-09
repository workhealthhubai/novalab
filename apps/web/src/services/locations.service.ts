import type { LocationRef } from '@/types/patient';
import { apiClient, unwrap } from './api-client';

export const locationsService = {
  async provinces(): Promise<LocationRef[]> {
    return unwrap(await apiClient.get('/locations/provinces'));
  },
  async districts(provinceId: number): Promise<LocationRef[]> {
    return unwrap(await apiClient.get(`/locations/provinces/${provinceId}/districts`));
  },
  async neighborhoods(districtId: number): Promise<LocationRef[]> {
    return unwrap(await apiClient.get(`/locations/districts/${districtId}/neighborhoods`));
  },
};
