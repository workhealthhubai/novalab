import { analyzeTest, toThresholds } from './audiometry-analysis';

const normal = {
  '500': 10,
  '1000': 10,
  '2000': 15,
  '3000': 15,
  '4000': 20,
  '6000': 20,
  '8000': 15,
};
const worse = { '500': 15, '1000': 15, '2000': 30, '3000': 40, '4000': 50, '6000': 40, '8000': 25 };
const t = (id: string, day: number, airRight: object, airLeft: object) => ({
  id,
  performedAt: new Date(`2026-01-${String(day).padStart(2, '0')}T08:00:00Z`),
  airRight: toThresholds(airRight),
  airLeft: toThresholds(airLeft),
});

describe('audiometry analysis', () => {
  it('flags a standard threshold shift against the baseline and a noise notch', () => {
    const analysis = analyzeTest(
      t('c', 20, worse, normal),
      t('b', 1, normal, normal),
      t('p', 10, normal, normal),
    );
    expect(analysis.right.pta).toBe(27.5);
    expect(analysis.right.grade?.key).toBe('MILD');
    expect(analysis.vsBaseline?.right.shiftDb).toBe(23.3);
    expect(analysis.vsBaseline?.right.sts).toBe(true);
    expect(analysis.vsBaseline?.left.sts).toBe(false);
    expect(analysis.flags).toEqual(['STS_BASELINE', 'STS_PREVIOUS', 'NOISE_NOTCH']);
  });

  it('flags interaural asymmetry of 15 dB or more', () => {
    const deaf = { '500': 40, '1000': 45, '2000': 50, '4000': 55 };
    expect(analyzeTest(t('c', 2, deaf, normal), null, null).flags).toContain('ASYMMETRY');
  });

  it('reports no flags for a stable normal test', () => {
    const analysis = analyzeTest(t('c', 20, normal, normal), t('b', 1, normal, normal), null);
    expect(analysis.flags).toEqual([]);
    expect(analysis.vsPrevious).toBeNull();
    expect(analysis.vsBaseline?.right.shiftDb).toBe(0);
  });

  it('tolerates invalid stored JSON', () => {
    expect(toThresholds('garbage')).toEqual({});
    expect(toThresholds({ '500': 12 })).toEqual({});
  });
});
