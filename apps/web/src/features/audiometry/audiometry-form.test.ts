import { describe, expect, it } from 'vitest';
import { initialValues, toInput } from './audiometry-form-values';
import { draftError, emptyDraft, fromDraft, toDraft } from './threshold-draft';

describe('audiometry form helpers', () => {
  it('round-trips thresholds through the draft', () => {
    const draft = toDraft({ '500': 10, '1000': null, '4000': 25 });
    expect(draft['500']).toBe('10');
    expect(draft['1000']).toBe('');
    expect(fromDraft(draft)).toMatchObject({ '500': 10, '1000': null, '4000': 25, '250': null });
  });

  it('validates cells on the 5 dB grid', () => {
    expect(draftError('')).toBeNull();
    expect(draftError('15')).toBeNull();
    expect(draftError('12')).toBe('5 dB adım');
    expect(draftError('130')).toBe('-10…120');
  });

  it('builds the API payload, dropping empty bone rows', () => {
    const values = initialValues({ patient: { id: 'p1' } as never, protocolId: 'pr1' });
    values.date = '2026-09-09';
    values.time = '10:30';
    values.airRight = { ...emptyDraft(), '500': '10', '1000': '10', '2000': '15', '4000': '20' };
    values.bone = true;
    const input = toInput(values);
    expect(input.employeeId).toBe('p1');
    expect(input.protocolId).toBe('pr1');
    expect(input.airRight['500']).toBe(10);
    expect(input.boneRight).toBeNull();
    expect(new Date(input.performedAt!).getMinutes()).toBe(30);
  });
});
