import { mapHeaders, parseCompanyRow, parseHazardClass } from './company-import-parser';

const lookups = {
  existingNames: new Set(['orneksanayias']),
  existingTaxNumbers: new Set(['1234567890']),
};

describe('company import parser', () => {
  it('maps headers and aliases', () => {
    const { mapping, unknown, missing } = mapHeaders([
      'Ünvan',
      'VKN',
      'Tehlike Sınıfı',
      'Şube Sayısı',
    ]);
    expect([...mapping.values()]).toEqual(['name', 'taxNumber', 'hazardClass']);
    expect(unknown).toEqual(['Şube Sayısı']);
    expect(missing).toEqual([]);
    expect(mapHeaders(['Vergi No']).missing).toEqual(['Firma Adı']);
  });

  it('parses hazard classes from labels, numbers and enum keys', () => {
    expect(parseHazardClass('Çok Tehlikeli')).toBe('VERY_HAZARDOUS');
    expect(parseHazardClass('az')).toBe('LESS_HAZARDOUS');
    expect(parseHazardClass(2)).toBe('HAZARDOUS');
    expect(parseHazardClass('HAZARDOUS')).toBe('HAZARDOUS');
    expect(parseHazardClass('')).toBeUndefined();
    expect(parseHazardClass('orta')).toBeNull();
  });

  it('validates rows and flags existing/duplicate companies by name or tax number', () => {
    const seen = { names: new Set<string>(), taxNumbers: new Set<string>() };
    const ok = parseCompanyRow(
      {
        name: 'Yeni  Firma Ltd.',
        taxNumber: '987 654 3210',
        hazardClass: 'Tehlikeli',
        email: 'Info@Yeni.com',
      },
      2,
      lookups,
      seen,
    );
    expect(ok.status).toBe('ok');
    expect(ok.company).toEqual({
      name: 'Yeni Firma Ltd.',
      taxNumber: '9876543210',
      hazardClass: 'HAZARDOUS',
      email: 'info@yeni.com',
    });
    expect(parseCompanyRow({ name: 'yeni firma ltd.' }, 3, lookups, seen).status).toBe('duplicate');
    expect(parseCompanyRow({ name: 'ÖRNEK SANAYİ A.Ş.' }, 4, lookups, seen).status).toBe('exists');
    expect(
      parseCompanyRow({ name: 'Başka', taxNumber: '1234567890' }, 5, lookups, seen).errors,
    ).toEqual(['Bu vergi numarası zaten kayıtlı']);
    const bad = parseCompanyRow(
      { name: 'X', taxNumber: '12', hazardClass: 'orta', email: 'nope' },
      6,
      lookups,
      seen,
    );
    expect(bad.status).toBe('error');
    expect(bad.errors).toHaveLength(4);
  });
});
