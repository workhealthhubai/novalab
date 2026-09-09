import { describe, expect, it } from 'vitest';
import { acuityError, analyze, formErrors, initialValues, toInput } from './eye-form-values';

describe('eye form helpers', () => {
  it('validates acuity (decimal or Snellen) and Ishihara counts', () => {
    expect(acuityError('0,8')).toBeNull();
    expect(acuityError('6/12')).toBeNull();
    expect(acuityError('3')).not.toBeNull();
    const v = initialValues({ patient: { id: 'p1' } as never });
    v.farRight = '1';
    v.ishiharaCorrect = '20';
    v.ishiharaTotal = '14';
    expect(formErrors(v)).toEqual(['ishiharaCorrect']);
  });

  it('suggests glasses and builds the payload with corrected values only when enabled', () => {
    const v = initialValues({ patient: { id: 'p1' } as never, protocolId: 'pr1' });
    v.date = '2026-09-09';
    v.time = '09:00';
    v.farRight = '0,3';
    v.farLeft = '6/6';
    v.corrected = true;
    v.farRightCorrected = '1.0';
    expect(analyze(v).suggested).toBe('GLASSES');
    const input = toInput(v);
    expect(input).toMatchObject({
      employeeId: 'p1',
      protocolId: 'pr1',
      farRight: 0.3,
      farLeft: 1,
      farRightCorrected: 1,
      farLeftCorrected: null,
      recommendation: 'GLASSES',
      ishiharaTotal: null,
    });
    v.corrected = false;
    expect(toInput(v).farRightCorrected).toBeNull();
  });
});
