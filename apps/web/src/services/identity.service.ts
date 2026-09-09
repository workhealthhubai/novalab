import type { IdCardScanResult } from '@osgb/shared-types';
import { apiClient, unwrap } from './api-client';

export const identityService = {
  /** Uploads an ID card photo; the API reads the MRZ and returns the extracted fields. */
  async scan(file: File): Promise<IdCardScanResult> {
    const form = new FormData();
    form.append('image', file);
    return unwrap(await apiClient.post('/identity/scan', form, { timeout: 60_000 }));
  },
};
