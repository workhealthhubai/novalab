import type { Status } from '@/design-system/status-badge';
import type { ImportRowStatus } from '@/types/import';

export const IMPORT_STATUS: Record<ImportRowStatus, { label: string; status: Status }> = {
  ok: { label: 'Aktarılacak', status: 'completed' },
  error: { label: 'Hatalı', status: 'cancelled' },
  exists: { label: 'Zaten kayıtlı', status: 'waiting' },
  duplicate: { label: 'Dosyada tekrar', status: 'waiting' },
};
