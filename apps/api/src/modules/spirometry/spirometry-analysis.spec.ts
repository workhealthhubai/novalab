import { ageAt, analyzeSpirometry, ecscPredicted } from '@osgb/shared-types';

describe('spirometry analysis (shared helper, exercised from the API)', () => {
  const man = { sex: 'MALE' as const, heightCm: 175, ageYears: 40 };

  it('computes ECSC predicted values and ages', () => {
    expect(ecscPredicted('MALE', 175, 40)).toEqual({ fvc: 4.7, fev1: 3.87, ratio: 80 });
    expect(ecscPredicted('FEMALE', 165, 30)).toEqual({ fvc: 3.64, fev1: 3.17, ratio: 83.4 });
    expect(ecscPredicted('MALE', 175, 75)).toBeNull();
    expect(ageAt('1986-03-10', new Date('2026-03-09'))).toBe(39);
    expect(ageAt('1986-03-10', new Date('2026-03-10'))).toBe(40);
  });

  it('classifies a normal test', () => {
    const a = analyzeSpirometry({ fvc: 4.6, fev1: 3.8 }, man);
    expect(a.ratio).toBe(82.6);
    expect(a.ratioSource).toBe('derived');
    expect(a.predicted.source).toBe('ecsc');
    expect(a.fvcPercent).toBe(98);
    expect(a.pattern).toBe('NORMAL');
    expect(a.flags).toEqual([]);
  });

  it('flags obstruction with severity, bronchodilator response and FEV1 decline', () => {
    const a = analyzeSpirometry({ fvc: 4.2, fev1: 2.5, postFev1: 2.9 }, man, 3.5);
    expect(a.pattern).toBe('OBSTRUCTIVE');
    expect(a.fev1Percent).toBe(65);
    expect(a.severity?.key).toBe('MODERATE');
    expect(a.bronchodilator).toEqual({ fev1GainMl: 400, fev1GainPercent: 16, positive: true });
    expect(a.fev1DeclinePercent).toBe(28.6);
    expect(a.flags).toEqual(['OBSTRUCTION', 'BD_RESPONSE', 'FEV1_DECLINE']);
  });

  it('prefers device predicted values and detects restriction / mixed patterns', () => {
    const restrictive = analyzeSpirometry(
      { fvc: 3.0, fev1: 2.6, fvcPredicted: 4.7, fev1Predicted: 3.9 },
      man,
    );
    expect(restrictive.predicted.source).toBe('device');
    expect(restrictive.pattern).toBe('RESTRICTIVE');
    expect(analyzeSpirometry({ fvc: 3.0, fev1: 1.9 }, man).pattern).toBe('MIXED');
    expect(
      analyzeSpirometry({ fvc: 3.0, fev1: 2.5 }, { sex: null, heightCm: null, ageYears: null })
        .flags,
    ).toEqual(['NO_PREDICTED']);
  });
});
