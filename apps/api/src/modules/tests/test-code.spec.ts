import { normalizeTestCode } from './test-code';

describe('normalizeTestCode', () => {
  it('upper-cases, folds Turkish letters, collapses whitespace to dashes and drops other symbols', () => {
    expect(normalizeTestCode(' lab hgb ')).toBe('LAB-HGB');
    expect(normalizeTestCode('rad/pa')).toBe('RADPA');
    expect(normalizeTestCode('işitme_1')).toBe('ISITME_1');
    expect(normalizeTestCode('göz-ç1')).toBe('GOZ-C1');
  });
});
