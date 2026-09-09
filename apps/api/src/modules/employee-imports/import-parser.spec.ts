import {
  type ImportLookups,
  mapHeaders,
  parseDate,
  parseRow,
  summarize,
  titleCase,
} from './import-parser';

const lookups: ImportLookups = {
  companyByKey: new Map([
    ['ornekas', { id: 'c1', name: 'Örnek A.Ş.' }],
    ['1234567890', { id: 'c1', name: 'Örnek A.Ş.' }],
  ]),
  occupationByKey: new Map([
    ['kaynakci', { id: 'o1', name: 'Kaynakçı' }],
    ['7212', { id: 'o1', name: 'Kaynakçı' }],
  ]),
  existingNationalIds: new Set(['10000000146']),
};

describe('import parser', () => {
  it('title-cases names with Turkish rules', () => {
    expect(titleCase('ayşe nur')).toBe('Ayşe Nur');
    expect(titleCase('YILMAZ')).toBe('Yılmaz');
    expect(titleCase('ışık-ipek')).toBe('Işık-İpek');
  });

  it('maps Turkish headers, aliases and reports unknown/missing columns', () => {
    const { mapping, unknown, missing } = mapHeaders([
      'TC KİMLİK NO',
      'Adı',
      'Soyadı',
      'Doğum Tarihi',
      'Cep Telefonu',
      'Şube',
      'Firma',
    ]);
    expect([...mapping.values()]).toEqual([
      'nationalId',
      'firstName',
      'lastName',
      'birthDate',
      'phone',
      'company',
    ]);
    expect(unknown).toEqual(['Şube']);
    expect(missing).toEqual([]);
    expect(mapHeaders(['Ad', 'Soyad']).missing).toEqual(['TC Kimlik No', 'Doğum Tarihi', 'GSM']);
  });

  it('parses dates from strings, Date cells and Excel serials', () => {
    expect(parseDate('15.01.1990')).toBe('1990-01-15');
    expect(parseDate('1990-01-15')).toBe('1990-01-15');
    expect(parseDate(new Date(Date.UTC(1990, 0, 15)))).toBe('1990-01-15');
    expect(parseDate(32888)).toBe('1990-01-15');
    expect(parseDate('31.02.1990')).toBeNull();
    expect(parseDate('yarın')).toBeNull();
  });

  it('validates a good row and resolves company/occupation by name or code', () => {
    const seen = new Set<string>();
    const row = parseRow(
      {
        nationalId: '10000000147',
        firstName: 'ayşe',
        lastName: 'yılmaz',
        birthDate: '15.01.1990',
        gender: 'K',
        phone: '0532 123 45 67',
        company: 'ÖRNEK A.Ş.',
        occupation: '7212',
        email: 'Ayse@Example.com',
      },
      2,
      lookups,
      seen,
    );
    expect(row.status).toBe('error'); // 10000000147 fails the checksum on purpose
    const good = parseRow(
      {
        nationalId: '10000000146',
        firstName: 'ayşe',
        lastName: 'yılmaz',
        birthDate: '15.01.1990',
        gender: 'K',
        phone: '0532 123 45 67',
        company: 'ÖRNEK A.Ş.',
        occupation: '7212',
        email: 'Ayse@Example.com',
      },
      3,
      { ...lookups, existingNationalIds: new Set() },
      new Set(),
    );
    expect(good.errors).toEqual([]);
    expect(good.status).toBe('ok');
    expect(good.employee).toMatchObject({
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      gender: 'FEMALE',
      phone: '5321234567',
      companyId: 'c1',
      occupationId: 'o1',
      email: 'ayse@example.com',
      birthDate: '1990-01-15',
    });
    expect(good.display).toEqual({
      fullName: 'Ayşe Yılmaz',
      nationalId: '10000000146',
      company: 'Örnek A.Ş.',
      occupation: 'Kaynakçı',
    });
  });

  it('flags existing and in-file duplicate national ids and collects all field errors', () => {
    const seen = new Set<string>();
    const base = {
      nationalId: '10000000146',
      firstName: 'Ali',
      lastName: 'Kaya',
      birthDate: '01.01.1980',
      phone: '5321112233',
    };
    expect(parseRow(base, 2, lookups, seen).status).toBe('exists');
    const fresh = { ...lookups, existingNationalIds: new Set<string>() };
    const seen2 = new Set<string>();
    expect(parseRow(base, 2, fresh, seen2).status).toBe('ok');
    expect(parseRow(base, 3, fresh, seen2).status).toBe('duplicate');
    const bad = parseRow(
      {
        nationalId: '123',
        firstName: '',
        lastName: 'X',
        birthDate: '2999-01-01',
        phone: '212',
        gender: 'Z',
        company: 'Yok A.Ş.',
      },
      4,
      fresh,
      new Set(),
    );
    expect(bad.status).toBe('error');
    expect(bad.errors).toEqual(
      expect.arrayContaining([
        'TC Kimlik No geçersiz',
        'Ad boş',
        'Doğum tarihi gelecekte',
        'GSM geçersiz (5XX XXX XX XX)',
        'Cinsiyet E/K olmalı',
        'Firma bulunamadı: Yok A.Ş.',
      ]),
    );
    expect(summarize([bad])).toEqual({ total: 1, ok: 0, error: 1, exists: 0, duplicate: 0 });
  });
});
