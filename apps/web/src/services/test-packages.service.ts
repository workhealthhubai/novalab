import type { PaginatedResult } from '@osgb/shared-types';
import type { TestPackage, TestPackageInput, TestPackageListQuery } from '@/types/test-package';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const testPackagesService = {
  async list(query: TestPackageListQuery = {}): Promise<PaginatedResult<TestPackage>> {
    return toPaginated(await apiClient.get('/test-packages', { params: query }));
  },
  async create(input: TestPackageInput): Promise<TestPackage> {
    return unwrap(await apiClient.post('/test-packages', input));
  },
  async update(id: string, input: Partial<TestPackageInput>): Promise<TestPackage> {
    return unwrap(await apiClient.patch(`/test-packages/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/test-packages/${id}`);
  },
};
