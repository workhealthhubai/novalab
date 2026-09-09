import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConsentType } from '@osgb/shared-types';
import { consentsService } from '@/services/consents.service';
import type { ConsentListQuery, GiveConsentInput, PublishTemplateInput } from '@/types/consent';

export const consentKeys = {
  all: ['consents'] as const,
  templates: (query: { type?: ConsentType; activeOnly?: boolean }) =>
    ['consents', 'templates', query] as const,
  list: (query: ConsentListQuery) => ['consents', 'list', query] as const,
  summary: (employeeId: string) => ['consents', 'summary', employeeId] as const,
};

export function useConsentTemplates(
  query: { type?: ConsentType; activeOnly?: boolean } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: consentKeys.templates(query),
    queryFn: () => consentsService.templates(query),
    enabled,
  });
}

export function useConsents(query: ConsentListQuery) {
  return useQuery({
    queryKey: consentKeys.list(query),
    queryFn: () => consentsService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useConsentSummary(employeeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: consentKeys.summary(employeeId ?? ''),
    queryFn: () => consentsService.summary(employeeId!),
    enabled: Boolean(employeeId) && enabled,
  });
}

export function useConsentMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: consentKeys.all });
  return {
    publish: useMutation({
      mutationFn: (input: PublishTemplateInput) => consentsService.publishTemplate(input),
      onSuccess: invalidate,
    }),
    importDefaults: useMutation({
      mutationFn: () => consentsService.importDefaults(),
      onSuccess: invalidate,
    }),
    give: useMutation({
      mutationFn: (input: GiveConsentInput) => consentsService.give(input),
      onSuccess: invalidate,
    }),
    withdraw: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string | null }) =>
        consentsService.withdraw(id, reason),
      onSuccess: invalidate,
    }),
  };
}
