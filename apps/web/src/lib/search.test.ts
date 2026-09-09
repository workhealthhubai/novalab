import { describe, expect, it } from 'vitest';
import { foldSearch, rankOption } from '@/lib/search';

describe('combobox search', () => {
  it('folds Turkish letters and accents so ASCII typing matches', () => {
    expect(foldSearch('İstanbul')).toBe('istanbul');
    expect(foldSearch('Çankaya')).toBe('cankaya');
    expect(foldSearch('IĞDIR')).toBe('igdir');
  });

  it('ranks prefix matches above substring matches and hides the rest', () => {
    expect(rankOption('Çankaya', 'can')).toBe(2);
    expect(rankOption('Ankara', 'kar')).toBe(1);
    expect(rankOption('Ankara', 'izm')).toBe(0);
    expect(rankOption('Ankara', '')).toBe(1);
  });
});
