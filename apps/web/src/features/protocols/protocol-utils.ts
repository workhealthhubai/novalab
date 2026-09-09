import { PATHS } from '@/app/router/navigation';

export function protocolPath(id: string): string {
  return PATHS.protocolDetail.replace(':protocolId', id);
}

/** "3 / 5" style progress of a protocol's items (cancelled ones are excluded from the total). */
export function itemProgress(items: ReadonlyArray<{ status: string }>): {
  done: number;
  total: number;
} {
  const active = items.filter((item) => item.status !== 'CANCELLED');
  return { done: active.filter((item) => item.status === 'DONE').length, total: active.length };
}
