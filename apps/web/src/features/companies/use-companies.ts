import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchesService, companiesService, workplacesService } from '@/services/companies.service';
import type { BranchInput, CompanyInput, WorkplaceInput } from '@/types/company';

export const companyKeys = {
  all: ['companies'] as const,
  page: (query: { page?: number; pageSize?: number; search?: string }) =>
    ['companies', 'page', query] as const,
  detail: (id: string) => ['companies', 'detail', id] as const,
};

export function useCompanyPage(query: { page?: number; pageSize?: number; search?: string }) {
  return useQuery({
    queryKey: companyKeys.page(query),
    queryFn: () => companiesService.page(query),
    placeholderData: keepPreviousData,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: companyKeys.detail(id ?? ''),
    queryFn: () => companiesService.get(id!),
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: companyKeys.all });
}

export function useCompanyMutations() {
  const invalidate = useInvalidate();
  return {
    create: useMutation({
      mutationFn: (input: CompanyInput) => companiesService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<CompanyInput> }) =>
        companiesService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => companiesService.remove(id),
      onSuccess: invalidate,
    }),
  };
}

export function useBranchMutations() {
  const invalidate = useInvalidate();
  return {
    create: useMutation({
      mutationFn: (input: BranchInput) => branchesService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<BranchInput> }) =>
        branchesService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => branchesService.remove(id),
      onSuccess: invalidate,
    }),
  };
}

export function useWorkplaceMutations() {
  const invalidate = useInvalidate();
  return {
    create: useMutation({
      mutationFn: (input: WorkplaceInput) => workplacesService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<WorkplaceInput> }) =>
        workplacesService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => workplacesService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
