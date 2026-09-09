import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { testsService } from '@/services/tests.service';
import type { TestDefinitionInput, TestListQuery } from '@/types/test-definition';

export const testKeys = {
  all: ['tests'] as const,
  list: (query: TestListQuery) => ['tests', 'list', query] as const,
};

export function useTests(query: TestListQuery, enabled = true) {
  return useQuery({
    queryKey: testKeys.list(query),
    queryFn: () => testsService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTestMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: testKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: TestDefinitionInput) => testsService.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<TestDefinitionInput> }) =>
        testsService.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => testsService.remove(id),
      onSuccess: invalidate,
    }),
  };
}
