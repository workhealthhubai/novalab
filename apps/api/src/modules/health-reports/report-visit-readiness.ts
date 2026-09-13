import type { ProtocolItemType } from '@osgb/shared-types';

export const CLINICAL_TEST_MODULES = {
  LAB: 'lab',
  RADIOLOGY: 'radiology',
  AUDIOMETRY: 'audiometry',
  ECG: 'ecg',
  SPIROMETRY: 'spirometry',
  EYE: 'eye',
  PNEUMOCONIOSIS: 'pneumoconiosis',
} as const;

interface Visit {
  status: string;
  deletedAt?: Date | null;
  items: ReadonlyArray<{ type: ProtocolItemType; status: string; note?: string | null }>;
}

/** Only tests ordered for this visit are required; no universal test battery. */
export function visitBlockers(
  visit: Visit | null,
  tests?: ReadonlyArray<{ module: string }>,
): string[] {
  if (!visit || visit.deletedAt) return ['MISSING_PROTOCOL'];
  if (visit.status === 'CANCELLED') return ['PROTOCOL_CANCELLED'];
  const available = new Set(tests?.map((test) => test.module));
  const blockers: string[] = [];
  for (const item of visit.items) {
    const module = CLINICAL_TEST_MODULES[item.type as keyof typeof CLINICAL_TEST_MODULES];
    if (!module) continue; // The report itself and separate ISG paperwork cannot block its own approval.
    if (item.status === 'CANCELLED') {
      if (!item.note?.trim()) blockers.push(`CANCELLATION_REASON_${item.type}`);
    } else if (item.status !== 'DONE') {
      blockers.push(`PENDING_TEST_${item.type}`);
    } else if (tests && !available.has(module)) {
      blockers.push(`MISSING_RESULT_${item.type}`);
    }
  }
  return blockers;
}
