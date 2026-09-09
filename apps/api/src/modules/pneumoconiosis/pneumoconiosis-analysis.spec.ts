import { analyzePneumoconiosis, profusionCategory } from '@osgb/shared-types';

describe('pneumoconiosis analysis (shared helper, exercised from the API)', () => {
  it('maps profusion to the major category', () => {
    expect(profusionCategory('0/0')).toBe(0);
    expect(profusionCategory('1/2')).toBe(1);
    expect(profusionCategory('3/+')).toBe(3);
    expect(profusionCategory('x')).toBeNull();
  });

  it('classifies negative, borderline and positive readings', () => {
    expect(analyzePneumoconiosis({ profusion: '0/0', largeOpacity: '0' })).toMatchObject({
      category: 0,
      suggested: 'NEGATIVE',
      flags: [],
    });
    expect(analyzePneumoconiosis({ profusion: '0/1' }).suggested).toBe('BORDERLINE');
    const positive = analyzePneumoconiosis({
      profusion: '1/1',
      zones: ['RU', 'LU'],
      largeOpacity: 'A',
      pleuralPlaques: true,
      symbols: ['tb', 'em'],
    });
    expect(positive).toMatchObject({
      category: 1,
      zoneCount: 2,
      pleuralAbnormality: true,
      alertSymbols: ['tb'],
      suggested: 'POSITIVE',
    });
    expect(positive.flags).toEqual([
      'SMALL_OPACITIES',
      'LARGE_OPACITIES',
      'PLEURAL_ABNORMALITY',
      'SYMBOL_ALERT',
    ]);
  });

  it('flags progression against the previous film and unreadable films', () => {
    expect(analyzePneumoconiosis({ profusion: '2/1' }, '1/1').flags).toContain('PROGRESSION');
    expect(analyzePneumoconiosis({ profusion: '1/1' }, '1/2').flags).not.toContain('PROGRESSION');
    expect(analyzePneumoconiosis({ filmQuality: 4 }).flags).toEqual(['UNREADABLE']);
  });
});
