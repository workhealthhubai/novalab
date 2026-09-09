import { ProtocolItemStatus, ProtocolStatus } from '@osgb/shared-types';

/** `2026-000123`: per-tenant, per-year sequence, zero-padded to six digits. */
export function formatProtocolNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(6, '0')}`;
}

/** Statuses in which a protocol can still be edited (items, notes, type, company). */
export function isProtocolEditable(status: ProtocolStatus): boolean {
  return status === ProtocolStatus.OPEN || status === ProtocolStatus.IN_PROGRESS;
}

/** Allowed status changes for a single item (a cancelled item can be reopened, a done one too). */
const ITEM_TRANSITIONS: Record<ProtocolItemStatus, readonly ProtocolItemStatus[]> = {
  PENDING: [ProtocolItemStatus.DONE, ProtocolItemStatus.CANCELLED],
  DONE: [ProtocolItemStatus.PENDING, ProtocolItemStatus.CANCELLED],
  CANCELLED: [ProtocolItemStatus.PENDING],
};

export function canChangeItemStatus(from: ProtocolItemStatus, to: ProtocolItemStatus): boolean {
  return from === to || ITEM_TRANSITIONS[from].includes(to);
}

/**
 * Protocol status derived from its items while it is open: the first completed item moves it to
 * IN_PROGRESS; reverting every item to pending moves it back to OPEN. COMPLETED and CANCELLED are
 * only reached through explicit close/cancel actions.
 */
export function deriveOpenStatus(
  current: ProtocolStatus,
  items: ReadonlyArray<{ status: ProtocolItemStatus }>,
): ProtocolStatus {
  if (!isProtocolEditable(current)) return current;
  const anyDone = items.some((item) => item.status === ProtocolItemStatus.DONE);
  return anyDone ? ProtocolStatus.IN_PROGRESS : ProtocolStatus.OPEN;
}

/** Items that block closing: still pending. */
export function pendingItems<T extends { status: ProtocolItemStatus }>(items: readonly T[]): T[] {
  return items.filter((item) => item.status === ProtocolItemStatus.PENDING);
}
