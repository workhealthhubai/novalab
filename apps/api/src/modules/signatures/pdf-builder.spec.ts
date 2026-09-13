import sharp from 'sharp';
import { buildConsentPdf, pageCount, stampPdf, wrapText } from './pdf-builder';
import { decodeSignatureDataUrl, prepareSignatureStroke } from './signature-image';

async function strokePng(): Promise<Buffer> {
  // A diagonal "stroke" on a transparent 400×150 canvas.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150"><path d="M20 120 C 80 10, 160 140, 240 40 S 360 90, 380 30" stroke="black" stroke-width="4" fill="none"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

describe('pdf-builder', () => {
  it('wraps long paragraphs and keeps blank lines', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText('one two three four five six seven\n\nshort', font, 10, 60);
    expect(lines.length).toBeGreaterThan(3);
    expect(lines).toContain('');
    expect(lines.at(-1)).toBe('short');
  });

  it('renders a multi-page consent PDF with Turkish text and the signature block', async () => {
    const signature = await prepareSignatureStroke(await strokePng());
    const body = Array.from(
      { length: 40 },
      (_, i) =>
        `${i + 1}. Kişisel verileriniz İş Sağlığı ve Güvenliği mevzuatı kapsamında işlenir; ğüşıöç harfleri dâhil.`,
    ).join('\n\n');
    const pdf = await buildConsentPdf({
      organizationName: 'Örnek OSGB A.Ş.',
      title: 'Aydınlatma Metni',
      version: 2,
      body,
      patient: {
        fullName: 'Ayşe Yılmaz',
        nationalId: '10000000146',
        birthDate: new Date('1990-01-15'),
      },
      signature: {
        signaturePng: signature,
        signerName: 'Ayşe Yılmaz',
        signedAt: new Date('2026-09-09T08:00:00Z'),
        collectorName: 'Demo Admin',
        documentNo: 'doc-1',
      },
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(await pageCount(pdf)).toBeGreaterThanOrEqual(2);
  }, 20_000);

  it('stamps an existing PDF on its last page', async () => {
    const signature = await prepareSignatureStroke(await strokePng());
    const { PDFDocument } = await import('pdf-lib');
    const source = await PDFDocument.create();
    source.addPage();
    source.addPage();
    const input = Buffer.from(await source.save());
    const stamped = await stampPdf(input, {
      signaturePng: signature,
      signerName: 'Ayşe Yılmaz',
      signedAt: new Date(),
      collectorName: 'Demo Admin',
      documentNo: 'doc-2',
    });
    expect(await pageCount(stamped)).toBe(2);
    expect(stamped.length).toBeGreaterThan(input.length);
  });

  it('rejects anything but a PNG data URL and blank pads', async () => {
    expect(() => decodeSignatureDataUrl('data:image/jpeg;base64,AAAA')).toThrow('PNG data URL');
    expect(() => decodeSignatureDataUrl('hello')).toThrow();
    const blank = await sharp({
      create: { width: 300, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    await expect(prepareSignatureStroke(blank)).rejects.toThrow(/empty|read/);
    const valid = decodeSignatureDataUrl(
      `data:image/png;base64,${(await strokePng()).toString('base64')}`,
    );
    expect(valid.length).toBeGreaterThan(100);
  });
});
