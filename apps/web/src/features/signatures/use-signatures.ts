import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { consentKeys } from '@/features/consents/use-consents';
import { signaturesService } from '@/services/signatures.service';
import type { SignatureListQuery, SignConsentInput, SignUploadInput } from '@/types/signature';

export const signatureKeys = {
  all: ['signatures'] as const,
  list: (query: SignatureListQuery) => ['signatures', 'list', query] as const,
  consentForm: (templateId: string) => ['signatures', 'consent-form', templateId] as const,
};

export function useSignatures(query: SignatureListQuery) {
  return useQuery({
    queryKey: signatureKeys.list(query),
    queryFn: () => signaturesService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useConsentForm(templateId: string | null) {
  return useQuery({
    queryKey: signatureKeys.consentForm(templateId ?? ''),
    queryFn: () => signaturesService.consentForm(templateId!),
    enabled: Boolean(templateId),
    staleTime: 5 * 60_000,
  });
}

export function useSignatureMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: signatureKeys.all });
    void queryClient.invalidateQueries({ queryKey: consentKeys.all });
  };
  return {
    signConsent: useMutation({
      mutationFn: (input: SignConsentInput) => signaturesService.signConsent(input),
      onSuccess: invalidate,
    }),
    signUpload: useMutation({
      mutationFn: (input: SignUploadInput) => signaturesService.signUpload(input),
      onSuccess: invalidate,
    }),
  };
}

/** Opens the presigned link in a new tab; the URL is short-lived so it is fetched on click. */
export async function openSignedPdf(id: string): Promise<void> {
  const { url } = await signaturesService.downloadUrl(id);
  window.open(url, '_blank', 'noopener');
}
