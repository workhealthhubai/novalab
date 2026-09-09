import type { PaginatedResult } from '@osgb/shared-types';
import type {
  Branch,
  BranchInput,
  Company,
  CompanyDetail,
  CompanyInput,
  CompanyListItem,
  Workplace,
  WorkplaceInput,
} from '@/types/company';
import type { NamedRef } from '@/types/patient';
import { apiClient, unwrap } from './api-client';
import { toPaginated } from './list';

export const companiesService = {
  /** Lightweight options for selects (first 100 matches). */
  async list(search?: string): Promise<PaginatedResult<NamedRef>> {
    return toPaginated(
      await apiClient.get('/companies', {
        params: { pageSize: 100, ...(search ? { search } : {}) },
      }),
    );
  },
  async page(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<CompanyListItem>> {
    return toPaginated(await apiClient.get('/companies', { params: query }));
  },
  async get(id: string): Promise<CompanyDetail> {
    return unwrap(await apiClient.get(`/companies/${id}`));
  },
  async create(input: CompanyInput): Promise<Company> {
    return unwrap(await apiClient.post('/companies', input));
  },
  async update(id: string, input: Partial<CompanyInput>): Promise<Company> {
    return unwrap(await apiClient.patch(`/companies/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/companies/${id}`);
  },
};

export const branchesService = {
  async create(input: BranchInput): Promise<Branch> {
    return unwrap(await apiClient.post('/branches', input));
  },
  async update(id: string, input: Partial<BranchInput>): Promise<Branch> {
    return unwrap(await apiClient.patch(`/branches/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/branches/${id}`);
  },
};

export const workplacesService = {
  async create(input: WorkplaceInput): Promise<Workplace> {
    return unwrap(await apiClient.post('/workplaces', input));
  },
  async update(id: string, input: Partial<WorkplaceInput>): Promise<Workplace> {
    return unwrap(await apiClient.patch(`/workplaces/${id}`, input));
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/workplaces/${id}`);
  },
};
