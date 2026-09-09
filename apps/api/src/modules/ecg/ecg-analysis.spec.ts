import { analyzeEcg, bazettQtc } from '@osgb/shared-types';

describe('ECG analysis (shared helper, exercised from the API)', () => {
  it('derives Bazett QTc and flags prolongation by sex', () => {
    expect(bazettQtc(400, 60)).toBe(400);
    expect(bazettQtc(400, 100)).toBe(516);
    expect(analyzeEcg({ qtInterval: 400, heartRate: 100 }, 'MALE').flags).toContain(
      'MARKEDLY_LONG_QTC',
    );
    expect(analyzeEcg({ qtInterval: 440, heartRate: 62 }, 'FEMALE').flags).not.toContain(
      'LONG_QTC',
    );
    expect(analyzeEcg({ qtcInterval: 455 }, 'MALE')).toMatchObject({
      qtc: 455,
      qtcSource: 'device',
      flags: ['LONG_QTC'],
    });
  });

  it('flags rate, PR, QRS, axis and non-sinus rhythm', () => {
    const a = analyzeEcg(
      {
        heartRate: 48,
        prInterval: 220,
        qrsDuration: 130,
        axis: -45,
        rhythm: 'ATRIAL_FIBRILLATION',
      },
      'MALE',
    );
    expect(a.flags).toEqual([
      'BRADYCARDIA',
      'LONG_PR',
      'WIDE_QRS',
      'LEFT_AXIS',
      'NON_SINUS_RHYTHM',
    ]);
    expect(a.suggested).toBe('ABNORMAL');
  });

  it('suggests normal / borderline / abnormal', () => {
    expect(
      analyzeEcg(
        {
          heartRate: 72,
          prInterval: 160,
          qrsDuration: 90,
          qtInterval: 380,
          axis: 60,
          rhythm: 'SINUS',
        },
        'MALE',
      ).suggested,
    ).toBe('NORMAL');
    expect(analyzeEcg({ heartRate: 104, rhythm: 'SINUS_TACHYCARDIA' }, 'MALE').suggested).toBe(
      'BORDERLINE',
    );
    expect(
      analyzeEcg({ heartRate: 72, findings: ['EARLY_REPOLARIZATION'] }, 'MALE').suggested,
    ).toBe('BORDERLINE');
    expect(analyzeEcg({ heartRate: 72, findings: ['LBBB'] }, 'MALE').suggested).toBe('ABNORMAL');
  });
});
