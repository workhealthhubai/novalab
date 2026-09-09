import { describe, expect, it } from 'vitest';
import { analyze, formErrors, initialValues, numberError, toInput } from './spirometry-form-values';

describe('spirometry form helpers', () => {
  it('validates ranges, decimals and FEV1 ≤ FVC', () => {
    expect(numberError('fvc', '4,2')).toBeNull();
    expect(numberError('fvc', '12')).toBe('0.3…9 arası');
    expect(numberError('heightCm', '175.5')).toBe('Tam sayı');
    const v = initialValues({
      patient: { id: 'p1', gender: 'MALE', birthDate: '1986-03-10' } as never,
    });
    v.fvc = '3';
    v.fev1 = '3.5';
    expect(formErrors(v)).toEqual(['fev1']);
  });

  it('analyses live with ECSC predicted values and builds the payload', () => {
    const v = initialValues({
      patient: { id: 'p1', gender: 'MALE', birthDate: '1986-03-10' } as never,
      protocolId: 'pr1',
    });
    v.date = '2026-09-09';
    v.time = '10:00';
    v.heightCm = '175';
    v.fvc = '4,6';
    v.fev1 = '3.8';
    const a = analyze(v);
    expect(a.predicted.source).toBe('ecsc');
    expect(a.pattern).toBe('NORMAL');
    const input = toInput(v);
    expect(input).toMatchObject({
      employeeId: 'p1',
      protocolId: 'pr1',
      fvc: 4.6,
      fev1: 3.8,
      heightCm: 175,
      postFev1: null,
      isBaseline: false,
    });
  });
});
