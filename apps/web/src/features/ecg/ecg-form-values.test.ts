import { describe, expect, it } from 'vitest';
import { initialValues, numberError, suggest, toInput } from './ecg-form-values';

describe('ecg form helpers', () => {
  it('validates numeric fields against the catalogue ranges', () => {
    expect(numberError('heartRate', '')).toBeNull();
    expect(numberError('heartRate', '72')).toBeNull();
    expect(numberError('heartRate', '12')).toBe('20…300 arası tam sayı');
    expect(numberError('axis', '-200')).not.toBeNull();
  });

  it('suggests an interpretation and falls back to it when none is chosen', () => {
    const v = initialValues({ patient: { id: 'p1', gender: 'MALE' } as never });
    v.date = '2026-09-09';
    v.time = '09:15';
    v.heartRate = '110';
    v.rhythm = 'SINUS_TACHYCARDIA';
    expect(suggest(v).suggested).toBe('BORDERLINE');
    const input = toInput(v);
    expect(input.interpretation).toBe('BORDERLINE');
    expect(input.heartRate).toBe(110);
    expect(input.prInterval).toBeNull();
    expect(new Date(input.performedAt!).getMinutes()).toBe(15);
  });
});
