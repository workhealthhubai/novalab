import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radiologyService } from '@/services/radiology.service';
import type { CreateRadiologyRequestInput, RadiologyListQuery } from '@/types/radiology';

export const radiologyKeys = {
  all: ['radiology'] as const,
  list: (query: RadiologyListQuery) => ['radiology', 'list', query] as const,
  detail: (id: string) => ['radiology', 'detail', id] as const,
  study: (id: string) => ['radiology', 'study', id] as const,
  preview: (id: string, version: string | null) => ['radiology', 'preview', id, version] as const,
  candidates: (id: string) => ['radiology', 'candidates', id] as const,
  unlinked: ['radiology', 'unlinked'] as const,
};

export function useRadiologyRequests(query: RadiologyListQuery) {
  return useQuery({
    queryKey: radiologyKeys.list(query),
    queryFn: () => radiologyService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useRadiologyRequest(id: string | undefined) {
  return useQuery({
    queryKey: radiologyKeys.detail(id ?? ''),
    queryFn: () => radiologyService.get(id!),
    enabled: Boolean(id),
  });
}

export function useStudy(id: string | undefined, linked: boolean) {
  return useQuery({
    queryKey: radiologyKeys.study(id ?? ''),
    queryFn: () => radiologyService.study(id!),
    enabled: Boolean(id) && linked,
    staleTime: 60_000,
  });
}

/** `version` (the linked UID) busts the cache when a different study gets linked. */
export function useStudyPreview(id: string | undefined, version: string | null) {
  return useQuery({
    queryKey: radiologyKeys.preview(id ?? '', version),
    queryFn: () => radiologyService.preview(id!),
    enabled: Boolean(id) && Boolean(version),
    staleTime: Infinity,
  });
}

export function usePacsCandidates(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: radiologyKeys.candidates(id ?? ''),
    queryFn: () => radiologyService.candidates(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useUnlinkedStudies(enabled = true) {
  return useQuery({
    queryKey: radiologyKeys.unlinked,
    queryFn: () => radiologyService.unlinked(25),
    enabled,
    staleTime: 30_000,
  });
}

export function useRadiologyMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: radiologyKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: CreateRadiologyRequestInput) => radiologyService.create(input),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => radiologyService.cancel(id),
      onSuccess: invalidate,
    }),
    linkStudy: useMutation({
      mutationFn: ({ id, studyInstanceUid }: { id: string; studyInstanceUid: string }) =>
        radiologyService.linkStudy(id, studyInstanceUid),
      onSuccess: invalidate,
    }),
    report: useMutation({
      mutationFn: ({ id, reportText }: { id: string; reportText: string }) =>
        radiologyService.report(id, reportText),
      onSuccess: invalidate,
    }),
  };
}

/** Issues the viewer cookie, then opens OHIF in a new tab. */
export async function openInViewer(id: string): Promise<void> {
  const session = await radiologyService.viewerSession(id);
  window.open(session.viewerUrl, '_blank', 'noopener');
}
