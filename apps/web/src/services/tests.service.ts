import type { PaginatedResult } from '@osgb/shared-types';
import type { TestDefinition, TestDefinitionInput, TestListQuery } from '@/types/test-definition';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const testsService = {
  async list(query: TestListQuery = {}): Promise<PaginatedResult<TestDefinition>> {
    return toPaginated(await apiClient.get('/tests', { params: query }));
  },
  async create(input: TestDefinitionInput): Promise<TestDefinition> {
    return unwrap(await apiClient.post('/tests', input));
  },
  async update(id: string, input: Partial<TestDefinitionInput>): Promise<TestDefinition> {
    return unwrap(await apiClient.patch(`/tests/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tests/${id}`);
  },
};
