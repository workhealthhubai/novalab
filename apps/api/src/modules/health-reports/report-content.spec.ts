import { normalizeAnamnesis, normalizeSystemsExam } from './report-content';

describe('health report content normalisation', () => {
  it('whitelists anamnesis fields and enums', () => {
    const a = normalizeAnamnesis({
      complaints: ' Öksürük ',
      smoking: 'CURRENT',
      packYears: '12.34',
      alcohol: 'NONE',
      exposures: ['DUST', 'DUST', 'NOISE'],
      junk: 'x',
    });
    expect(a).toMatchObject({
      complaints: 'Öksürük',
      smoking: 'CURRENT',
      packYears: 12.3,
      alcohol: 'NONE',
      exposures: ['DUST', 'NOISE'],
    });
    expect('junk' in a).toBe(false);
    expect(() => normalizeAnamnesis({ smoking: 'LOTS' })).toThrow('smoking');
    expect(() => normalizeAnamnesis({ exposures: ['LAVA'] })).toThrow('exposures');
    expect(normalizeAnamnesis(undefined)).toEqual({});
  });

  it('whitelists system findings', () => {
    expect(
      normalizeSystemsExam({
        EYES: { status: 'ABNORMAL', note: 'Pterjium' },
        SKIN: { status: 'NORMAL' },
      }),
    ).toEqual({
      EYES: { status: 'ABNORMAL', note: 'Pterjium' },
      SKIN: { status: 'NORMAL', note: null },
    });
    expect(() => normalizeSystemsExam({ TAIL: { status: 'NORMAL' } })).toThrow('Unknown system');
    expect(() => normalizeSystemsExam({ EYES: { status: 'MEH' } })).toThrow('status');
  });
});
