import type {
  OperationInput,
  OperationKind,
  OperationOption,
  OperationRecord,
  PaginatedResult,
} from '@osgb/shared-types';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';
export interface OperationQuery {
  protocolId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}
export interface OperationSummary {
  states: { status: string; count: number; amountCents: number }[];
  balanceCents: number | null;
}
export const operationsService = {
  async list(
    kind: OperationKind,
    query: OperationQuery,
  ): Promise<PaginatedResult<OperationRecord>> {
    return toPaginated(await apiClient.get(`/operations/${kind}`, { params: query }));
  },
  async summary(kind: OperationKind, query: OperationQuery): Promise<OperationSummary> {
    return unwrap(await apiClient.get(`/operations/${kind}/summary`, { params: query }));
  },
  async options(kind: OperationKind, field: string, search: string): Promise<OperationOption[]> {
    return unwrap(
      await apiClient.get(`/operations/${kind}/options/${field}`, { params: { search } }),
    );
  },
  async save(kind: OperationKind, input: OperationInput, id?: string): Promise<OperationRecord> {
    return unwrap(
      id
        ? await apiClient.put(`/operations/${kind}/${id}`, input)
        : await apiClient.post(`/operations/${kind}`, input),
    );
  },
  async dashboard(): Promise<{
    patients: number | null;
    companies: number | null;
    protocols: number | null;
    reports: number | null;
  }> {
    return unwrap(await apiClient.get('/operations/dashboard'));
  },
  async remove(kind: OperationKind, id: string): Promise<{ success: boolean }> {
    return unwrap(await apiClient.delete(`/operations/${kind}/${id}`));
  },
};

