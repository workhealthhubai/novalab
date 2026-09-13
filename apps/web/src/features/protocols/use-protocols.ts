import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProtocolItemStatus, ProtocolItemType } from '@osgb/shared-types';
import { protocolsService } from '@/services/protocols.service';
import type { CreateProtocolInput, ProtocolListQuery, UpdateProtocolInput } from '@/types/protocol';

export const protocolKeys = {
  all: ['protocols'] as const,
  list: (query: ProtocolListQuery) => ['protocols', 'list', query] as const,
  detail: (id: string) => ['protocols', 'detail', id] as const,
  records: (id: string) => ['protocols', 'records', id] as const,
  worklist: (itemType: string) => ['protocols', 'worklist', itemType] as const,
};

export function useProtocols(query: ProtocolListQuery, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.list(query),
    queryFn: () => protocolsService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProtocolRecords(id: string | undefined) {
  return useQuery({
    queryKey: protocolKeys.records(id ?? ''),
    queryFn: () => protocolsService.records(id!),
    enabled: Boolean(id),
  });
}

export function useProtocolWorklist(itemType: ProtocolItemType, enabled = true) {
  return useQuery({
    queryKey: protocolKeys.worklist(itemType),
    queryFn: () => protocolsService.worklist(itemType),
    enabled,
    staleTime: 30_000,
  });
}

export function useProtocol(id: string | undefined) {
  return useQuery({
    queryKey: protocolKeys.detail(id ?? ''),
    queryFn: () => protocolsService.get(id!),
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: protocolKeys.all });
}

export function useCreateProtocol() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateProtocolInput) => protocolsService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProtocol(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateProtocolInput) => protocolsService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useAddProtocolItems(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (items: ProtocolItemType[]) => protocolsService.addItems(id, items),
    onSuccess: invalidate,
  });
}

export function useUpdateProtocolItem(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      itemId,
      ...input
    }: {
      itemId: string;
      status?: ProtocolItemStatus;
      note?: string | null;
    }) => protocolsService.updateItem(id, itemId, input),
    onSuccess: invalidate,
  });
}

export function useProtocolLifecycle(id: string) {
  const invalidate = useInvalidate();
  const close = useMutation({
    mutationFn: (input: boolean | { cancelPending: boolean; cancellationReason: string }) =>
      typeof input === 'boolean'
        ? protocolsService.close(id, input)
        : protocolsService.close(id, input.cancelPending, input.cancellationReason),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => protocolsService.cancel(id),
    onSuccess: invalidate,
  });
  const reopen = useMutation({
    mutationFn: () => protocolsService.reopen(id),
    onSuccess: invalidate,
  });
  return { close, cancel, reopen };
}

export type WorkStatus = 'ALL' | 'PENDING' | 'DONE';

/** Pending protocols of a module, ready to be merged into the module's own table. */
export function usePendingProtocols(
  itemType: ProtocolItemType,
  status: WorkStatus,
  enabled = true,
) {
  const worklist = useProtocolWorklist(itemType, enabled);
  const rows = enabled && status !== 'DONE' ? (worklist.data ?? []) : [];
  return {
    rows,
    total: enabled ? (worklist.data?.length ?? 0) : 0,
    isPending: enabled && worklist.isPending,
  };
}
