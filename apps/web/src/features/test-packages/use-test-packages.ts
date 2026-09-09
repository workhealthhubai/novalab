import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testPackagesService } from '@/services/test-packages.service';
import type { TestPackageInput, TestPackageListQuery } from '@/types/test-package';

export const testPackageKeys = {
  all: ['test-packages'] as const,
  list: (query: TestPackageListQuery) => ['test-packages', 'list', query] as const,
};

export function useTestPackages(query: TestPackageListQuery, enabled = true) {
  return useQuery({
    queryKey: testPackageKeys.list(query),
    queryFn: () => testPackagesService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTestPackageMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: testPackageKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: TestPackageInput) => testPackagesService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<TestPackageInput> }) =>
        testPackagesService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => testPackagesService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
