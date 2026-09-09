import { describe, expect, it } from 'vitest';
import { analyze, formErrors, initialValues, toInput } from './pneumoconiosis-form-values';

describe('pneumoconiosis form helpers', () => {
  it('requires profusion and a shape unless the film is unreadable', () => {
    const v = initialValues({ patient: { id: 'p1' } as never });
    expect(formErrors(v)).toEqual(['profusion']);
    v.profusion = '1/1';
    expect(formErrors(v)).toEqual(['shapePrimary']);
    v.shapePrimary = 'q';
    expect(formErrors(v)).toEqual([]);
    v.filmQuality = 4;
    expect(formErrors(v)).toEqual([]);
  });

  it('derives the result and clears the classification for unreadable films', () => {
    const v = initialValues({ patient: { id: 'p1' } as never, protocolId: 'pr1' });
    v.date = '2026-09-09';
    v.time = '09:00';
    v.profusion = '1/0';
    v.shapePrimary = 'p';
    v.zones = ['RU', 'LU'];
    expect(analyze(v).suggested).toBe('POSITIVE');
    expect(toInput(v)).toMatchObject({
      employeeId: 'p1',
      protocolId: 'pr1',
      profusion: '1/0',
      zones: ['RU', 'LU'],
      result: 'POSITIVE',
    });
    v.filmQuality = 4;
    expect(toInput(v)).toMatchObject({
      profusion: null,
      zones: [],
      largeOpacity: '0',
      result: 'NEGATIVE',
    });
  });
});
