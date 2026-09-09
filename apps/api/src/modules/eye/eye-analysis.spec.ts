import { analyzeEye, parseAcuity, snellenLabel } from '@osgb/shared-types';

describe('eye analysis (shared helper, exercised from the API)', () => {
  it('parses decimal and Snellen input', () => {
    expect(parseAcuity('0,8')).toBe(0.8);
    expect(parseAcuity('6/12')).toBe(0.5);
    expect(parseAcuity('20/40')).toBe(0.5);
    expect(parseAcuity('')).toBeNull();
    expect(parseAcuity('abc')).toBeNaN();
    expect(snellenLabel(0.5)).toBe('6/12');
  });

  it('is quiet for a normal examination', () => {
    const a = analyzeEye({
      farRight: 1,
      farLeft: 1,
      nearRight: 1,
      nearLeft: 1,
      ishiharaCorrect: 14,
      ishiharaTotal: 14,
      visualField: 'NORMAL',
    });
    expect(a.flags).toEqual([]);
    expect(a.colorVision).toBe('NORMAL');
    expect(a.colorVisionSource).toBe('plates');
    expect(a.suggested).toBe('NONE');
  });

  it('suggests glasses for a refractive error corrected by lenses', () => {
    const a = analyzeEye({
      farRight: 0.3,
      farLeft: 0.4,
      farRightCorrected: 1,
      farLeftCorrected: 1,
    });
    expect(a.bestRight).toBe(1);
    expect(a.flags).toEqual(['GLASSES_NEEDED']);
    expect(a.suggested).toBe('GLASSES');
  });

  it('suggests referral for low best acuity, asymmetry, colour deficiency or field defect', () => {
    const a = analyzeEye({
      farRight: 0.4,
      farLeft: 1,
      ishiharaCorrect: 8,
      ishiharaTotal: 14,
      visualField: 'ABNORMAL',
    });
    expect(a.flags).toEqual([
      'LOW_ACUITY_RIGHT',
      'ASYMMETRY',
      'COLOR_DEFICIENCY',
      'VISUAL_FIELD_ABNORMAL',
    ]);
    expect(a.suggested).toBe('REFERRAL');
    expect(
      analyzeEye({ farRight: 1, farLeft: 1, colorVision: 'DEFICIENT' }).colorVisionSource,
    ).toBe('given');
  });
});
