import {
  AUDIOMETRY_FREQUENCIES,
  type FrequencyKey,
  THRESHOLD_MAX_DB,
  THRESHOLD_MIN_DB,
  THRESHOLD_STEP_DB,
  type Thresholds,
} from '@osgb/shared-types';

/** Form state keeps raw strings so partially typed values survive re-renders. */
export type ThresholdDraft = Record<FrequencyKey, string>;

export function emptyDraft(): ThresholdDraft {
  return Object.fromEntries(AUDIOMETRY_FREQUENCIES.map((f) => [`${f}`, ''])) as ThresholdDraft;
}

export function toDraft(t: Thresholds | null | undefined): ThresholdDraft {
  const draft = emptyDraft();
  if (t)
    for (const f of AUDIOMETRY_FREQUENCIES)
      draft[`${f}`] = typeof t[`${f}`] === 'number' ? String(t[`${f}`]) : '';
  return draft;
}

export function draftError(value: string): string | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < THRESHOLD_MIN_DB || n > THRESHOLD_MAX_DB)
    return `${THRESHOLD_MIN_DB}…${THRESHOLD_MAX_DB}`;
  if (n % THRESHOLD_STEP_DB !== 0) return `${THRESHOLD_STEP_DB} dB adım`;
  return null;
}

export function fromDraft(draft: ThresholdDraft): Thresholds {
  const out: Thresholds = {};
  for (const f of AUDIOMETRY_FREQUENCIES) {
    const raw = draft[`${f}`].trim();
    out[`${f}`] = raw === '' ? null : Number(raw);
  }
  return out;
}

export function draftIsEmpty(draft: ThresholdDraft): boolean {
  return AUDIOMETRY_FREQUENCIES.every((f) => draft[`${f}`].trim() === '');
}
