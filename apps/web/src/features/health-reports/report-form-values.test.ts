import { describe, expect, it } from 'vitest';
import { allNormal, initialValues, toInput } from './report-form-values';
import type { HealthReport } from '@/types/health-report';

const report = {
  performedAt: '2026-09-09T06:30:00.000Z',
  physicianProfileId: 'ph1',
  anamnesis: { complaints: 'Öksürük', smoking: 'CURRENT', packYears: 10, exposures: ['DUST'] },
  systemsExam: { EYES: { status: 'ABNORMAL', note: 'Pterjium' } },
  findings: null,
  fitnessDecision: 'FIT_WITH_RESTRICTIONS',
  restrictions: 'Yüksekte çalışamaz',
  conclusion: null,
  nextExaminationDue: '2027-09-09',
} as unknown as HealthReport;

describe('health report form helpers', () => {
  it('seeds the form and builds the payload', () => {
    const v = initialValues(report);
    expect(v.anamnesis.packYears).toBe('10');
    expect(v.systems.EYES).toEqual({ status: 'ABNORMAL', note: 'Pterjium' });
    expect(v.systems.SKIN.status).toBe('NOT_EXAMINED');
    const input = toInput(v);
    expect(input.anamnesis).toMatchObject({
      complaints: 'Öksürük',
      smoking: 'CURRENT',
      packYears: 10,
      exposures: ['DUST'],
    });
    expect(input.systemsExam).toEqual({ EYES: { status: 'ABNORMAL', note: 'Pterjium' } });
    expect(input.restrictions).toBe('Yüksekte çalışamaz');
    expect(input.nextExaminationDue).toBe('2027-09-09');
  });

  it('drops restrictions for unconditional decisions and marks all systems normal', () => {
    const v = initialValues(report);
    v.fitnessDecision = 'FIT';
    expect(toInput(v).restrictions).toBeNull();
    const normal = allNormal(v.systems);
    expect(normal.SKIN.status).toBe('NORMAL');
    expect(normal.EYES.status).toBe('ABNORMAL');
  });
});
