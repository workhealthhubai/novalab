import type { PaginatedResult, ProtocolItemStatus, ProtocolItemType } from '@osgb/shared-types';
import type {
  CreateProtocolInput,
  Protocol,
  ProtocolListItem,
  ProtocolListQuery,
  UpdateProtocolInput,
  ProtocolRecords,
  ProtocolWorklistItem,
} from '@/types/protocol';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const protocolsService = {
  async list(query: ProtocolListQuery = {}): Promise<PaginatedResult<ProtocolListItem>> {
    return toPaginated(await apiClient.get('/protocols', { params: query }));
  },
  async worklist(itemType: ProtocolItemType, limit = 50): Promise<ProtocolWorklistItem[]> {
    return unwrap(await apiClient.get('/protocols/worklist', { params: { itemType, limit } }));
  },
  async records(id: string): Promise<ProtocolRecords> {
    return unwrap(await apiClient.get(`/protocols/${id}/records`));
  },
  async get(id: string): Promise<Protocol> {
    return unwrap(await apiClient.get(`/protocols/${id}`));
  },
  async create(input: CreateProtocolInput): Promise<Protocol> {
    return unwrap(await apiClient.post('/protocols', input));
  },
  async update(id: string, input: UpdateProtocolInput): Promise<Protocol> {
    return unwrap(await apiClient.patch(`/protocols/${id}`, input));
  },
  async addItems(id: string, items: ProtocolItemType[]): Promise<Protocol> {
    return unwrap(await apiClient.post(`/protocols/${id}/items`, { items }));
  },
  async updateItem(
    id: string,
    itemId: string,
    input: { status?: ProtocolItemStatus; note?: string | null },
  ): Promise<Protocol> {
    return unwrap(await apiClient.patch(`/protocols/${id}/items/${itemId}`, input));
  },
  async close(id: string, cancelPending = false): Promise<Protocol> {
    return unwrap(await apiClient.post(`/protocols/${id}/close`, { cancelPending }));
  },
  async cancel(id: string): Promise<Protocol> {
    return unwrap(await apiClient.post(`/protocols/${id}/cancel`));
  },
  async reopen(id: string): Promise<Protocol> {
    return unwrap(await apiClient.post(`/protocols/${id}/reopen`));
  },
};
