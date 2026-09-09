import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '@/services/organization.service';
import type { OrganizationInput } from '@/types/organization';

export const organizationKeys = {
  all: ['organization'] as const,
  logo: (version: string | null) => ['organization', 'logo', version] as const,
};

export function useOrganization() {
  return useQuery({ queryKey: organizationKeys.all, queryFn: () => organizationService.get() });
}

export function useOrganizationLogo(version: string | null | undefined) {
  return useQuery({
    queryKey: organizationKeys.logo(version ?? null),
    queryFn: () => organizationService.logo(),
    enabled: Boolean(version),
    staleTime: Infinity,
  });
}

export function useOrganizationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['tenant', 'current'] }); // topbar name
  };
  return {
    update: useMutation({
      mutationFn: (input: OrganizationInput) => organizationService.update(input),
      onSuccess: invalidate,
    }),
    setLogo: useMutation({
      mutationFn: (file: Blob) => organizationService.setLogo(file),
      onSuccess: invalidate,
    }),
    removeLogo: useMutation({
      mutationFn: () => organizationService.removeLogo(),
      onSuccess: invalidate,
    }),
  };
}
