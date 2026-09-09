import { examinationDate, presentKeys, toMeasurementMap } from './examination-comparison';

describe('examination comparison helpers', () => {
  const t1 = new Date('2026-01-01T00:00:00Z');
  const t2 = new Date('2026-02-01T00:00:00Z');

  it('adds a derived BMI from height and weight and stamps it with the newest recording', () => {
    const map = toMeasurementMap([
      { key: 'HEIGHT', value: '175', note: null, recordedAt: t1 },
      { key: 'WEIGHT', value: '80.5', note: 'giyinik', recordedAt: t2 },
    ]);
    expect(map.BMI?.value).toBe(26.3);
    expect(map.BMI?.recordedAt).toBe(t2);
    expect(map.WEIGHT?.value).toBe(80.5);
  });

  it('omits BMI when a component is missing', () => {
    expect(
      toMeasurementMap([{ key: 'WEIGHT', value: 80, note: null, recordedAt: t1 }]).BMI,
    ).toBeUndefined();
  });

  it('lists present keys in catalogue order', () => {
    const keys = presentKeys([
      { PULSE: { value: 70, note: null, recordedAt: t1 } },
      {
        HEIGHT: { value: 170, note: null, recordedAt: t1 },
        GLUCOSE: { value: 90, note: null, recordedAt: t1 },
      },
    ]);
    expect(keys).toEqual(['HEIGHT', 'PULSE', 'GLUCOSE']);
  });

  it('prefers performedAt, then scheduledAt, then createdAt', () => {
    expect(examinationDate({ performedAt: t2, scheduledAt: t1, createdAt: t1 })).toBe(t2);
    expect(examinationDate({ performedAt: null, scheduledAt: t1, createdAt: t2 })).toBe(t1);
    expect(examinationDate({ performedAt: null, scheduledAt: null, createdAt: t2 })).toBe(t2);
  });
});
