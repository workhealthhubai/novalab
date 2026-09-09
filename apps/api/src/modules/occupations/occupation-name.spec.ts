import { occupationNameKey } from './occupation-name';

describe('occupationNameKey', () => {
  it('folds Turkish upper-case letters and whitespace', () => {
    expect(occupationNameKey('KAYNAKÇI')).toBe('kaynakçı');
    expect(occupationNameKey('  İnşaat   İşçisi ')).toBe('inşaat işçisi');
    expect(occupationNameKey('Kaynakçı')).toBe(occupationNameKey('KAYNAKÇI'));
  });
});
