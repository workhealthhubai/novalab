import {
  buildTd1Mrz,
  extractMrzLines,
  mrzCheckDigit,
  parseTd1Mrz,
  selectBestMrz,
  mergeBarcode,
} from '@osgb/shared-types';

describe('MRZ parser (TD1, Turkish ID card)', () => {
  const lines = buildTd1Mrz({
    documentNumber: 'A12B34567',
    nationalId: '10000000146',
    birth: '900115',
    sex: 'F',
    expiry: '300114',
    surname: 'YILMAZ',
    givenNames: 'AYSE',
  });

  it('computes ICAO 9303 check digits', () => {
    expect(mrzCheckDigit('AB2134')).toBe(5);
    expect(mrzCheckDigit('<<<<<<')).toBe(0);
  });

  it('builds 30-character lines', () => {
    expect(lines.map((l) => l.length)).toEqual([30, 30, 30]);
  });

  it('parses all fields and validates every check digit', () => {
    const result = parseTd1Mrz(lines);
    expect(result.mrzValid).toBe(true);
    expect(result.fields).toMatchObject({
      nationalId: '10000000146',
      documentNumber: 'A12B34567',
      firstName: 'AYSE',
      lastName: 'YILMAZ',
      birthDate: '1990-01-15',
      gender: 'FEMALE',
      expiryDate: '2030-01-14',
      nationality: 'TUR',
    });
    expect(result.checks).toEqual({
      nationalIdChecksum: true,
      documentNumberChecksum: true,
      birthDateChecksum: true,
      expiryDateChecksum: true,
      compositeChecksum: true,
    });
  });

  it('flags a corrupted national id instead of silently accepting it', () => {
    const corrupted = [lines[0]!.replace('10000000146', '10000000147'), lines[1]!, lines[2]!];
    const result = parseTd1Mrz(corrupted);
    expect(result.mrzValid).toBe(false);
    expect(result.checks.nationalIdChecksum).toBe(false);
    expect(result.warnings.some((w) => w.includes('TC Kimlik No'))).toBe(true);
  });

  it('extracts MRZ lines from noisy OCR text and normalises OCR confusions in numeric fields', () => {
    const noisy = `Some header text\n\n${lines[0]!.toLowerCase()}\n${lines[1]!.replace('900115', '9OO115')} \n ${lines[2]!.slice(0, 28)}\n`;
    const extracted = extractMrzLines(noisy);
    expect(extracted).toHaveLength(3);
    const result = selectBestMrz(noisy);
    expect(result.fields.birthDate).toBe('1990-01-15');
    expect(result.fields.lastName).toBe('YILMAZ');
  });

  it('recovers from "<" read as L/K in filler areas (non OCR-B fonts)', () => {
    const misread = [
      'I<TURA12B34567<3<10000000146<<<'.replace('<<<', 'LLL'),
      lines[1]!.slice(0, 18) + 'K<KKLLLLLLL' + lines[1]!.slice(29),
      'YILMAZ<<AYSE<LLLLLLLLLLLLLLLLL',
    ];
    const result = parseTd1Mrz([lines[0]!.replace(/<<<$/, 'LLL'), misread[1]!, misread[2]!]);
    expect(result.fields.firstName).toBe('AYSE');
    expect(result.fields.lastName).toBe('YILMAZ');
    expect(result.fields.nationalId).toBe('10000000146');
    expect(result.checks.compositeChecksum).toBe(true);
  });

  it('keeps a line even when OCR turned every filler into letters (no "<" at all)', () => {
    const text = `${lines[0]}\n9001158F3001145TURKKLLLLLLKLLL8\n${lines[2]}`;
    const extracted = extractMrzLines(text);
    expect(extracted).toHaveLength(3);
    expect(parseTd1Mrz(extracted).checks.compositeChecksum).toBe(true);
  });

  it('picks the MRZ triple out of a full-card OCR text with other long lines', () => {
    const text = [
      'TURKIYE CUMHURIYETI KIMLIK KARTI',
      'REPUBLIC OF TURKEY IDENTITY CARD',
      'ANNE ADI MOTHERS NAME FATMA',
      'T.C. ICISLERI BAKANLIGI ISSUED BY',
      ...lines,
      'PEN 620173',
    ].join('\n');
    const result = selectBestMrz(text);
    expect(result.mrzValid).toBe(true);
    expect(result.fields.nationalId).toBe('10000000146');
  });

  it('maps digits misread inside the name line back to letters', () => {
    const result = parseTd1Mrz([lines[0]!, lines[1]!, 'Y1LMAZ<<AY5E<<<<<<<<<<<<<<<<<<']);
    expect(result.fields.lastName).toBe('YILMAZ');
    expect(result.fields.firstName).toBe('AYSE');
  });

  it('drops filler noise after the names but keeps real short names', () => {
    expect(
      parseTd1Mrz([lines[0]!, lines[1]!, 'YILMAZ<<AYSE<LLLL<CL<IKC<KK<<<']).fields.firstName,
    ).toBe('AYSE');
    expect(
      parseTd1Mrz([lines[0]!, lines[1]!, 'KAYA<<ECE<ALI<<<<<<<<<<<<<<<<<']).fields.firstName,
    ).toBe('ECE ALI');
  });

  it('repairs a "<<" separator whose second character was read as a letter', () => {
    expect(
      parseTd1Mrz([lines[0]!, lines[1]!, 'YILMAZ<KAYSE<<<<<<<<<<<<<<<<<<']).fields,
    ).toMatchObject({ lastName: 'YILMAZ', firstName: 'AYSE' });
    expect(
      parseTd1Mrz([lines[0]!, lines[1]!, 'KAYA<<KEMAL<<<<<<<<<<<<<<<<<<<']).fields,
    ).toMatchObject({ lastName: 'KAYA', firstName: 'KEMAL' });
  });

  it('cross-checks the document number with the card barcode', () => {
    const parsed = parseTd1Mrz(lines);
    expect(
      mergeBarcode(parsed, { format: 'Code128', text: 'A12B34567' }).checks
        .documentNumberBarcodeMatch,
    ).toBe(true);
    const mismatch = mergeBarcode(parsed, { format: 'Code128', text: 'A99B99999' });
    expect(mismatch.checks.documentNumberBarcodeMatch).toBe(false);
    expect(mismatch.warnings).toContain('Barkoddaki belge numarası MRZ ile eşleşmiyor');
    // barcode fills the document number when the MRZ line is unusable
    const broken = parseTd1Mrz(['I<TURXXXXXXXXX0<10000000146<<<', lines[1]!, lines[2]!]);
    const filled = mergeBarcode(broken, { format: 'Code128', text: 'A12B34567' });
    expect(filled.fields.documentNumber).toBe('A12B34567');
    expect(filled.warnings).toContain('Belge numarası barkoddan alındı');
    expect(
      mergeBarcode(parsed, { format: 'QRCode', text: 'https://example' }).fields.documentNumber,
    ).toBe('A12B34567');
  });

  it('returns a warning when no MRZ is present', () => {
    expect(parseTd1Mrz(extractMrzLines('just a photo of a cat'))).toMatchObject({
      mrzValid: false,
      warnings: ['MRZ satırları bulunamadı'],
    });
  });
});
