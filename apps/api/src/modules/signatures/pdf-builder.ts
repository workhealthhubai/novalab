import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib';

/** A4 in PDF points. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 50;
const BODY_SIZE = 10;
const LINE_HEIGHT = 14;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.45, 0.45, 0.5);

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;

/** DejaVu Sans covers Turkish glyphs (ğ, ş, İ, ı) that the built-in PDF fonts lack. */
function fonts() {
  if (!fontCache) {
    const req = createRequire(resolve(process.cwd(), 'package.json'));
    fontCache = {
      regular: readFileSync(req.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf')),
      bold: readFileSync(req.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')),
    };
  }
  return fontCache;
}

export interface SignatureBlock {
  /** Trimmed PNG of the signature. */
  signaturePng: Buffer;
  signerName: string;
  signedAt: Date;
  collectorName: string;
  /** Printed reference so the paper copy can be matched with the stored record. */
  documentNo: string;
}

export interface ConsentFormInput {
  organizationName: string;
  title: string;
  version: number;
  body: string;
  patient: { fullName: string; nationalId: string | null; birthDate: Date | null };
  signature: SignatureBlock;
}

export function formatIstanbul(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Greedy word wrap; words longer than the line are split by character. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let chunk = '';
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

export class Writer {
  page: PDFPage;
  y: number;
  constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    private readonly footer: string,
  ) {
    this.page = this.newPage();
    this.y = PAGE.height - MARGIN;
  }

  private newPage(): PDFPage {
    const page = this.doc.addPage([PAGE.width, PAGE.height]);
    page.drawText(this.footer, {
      x: MARGIN,
      y: MARGIN / 2,
      size: 7,
      font: this.regular,
      color: MUTED,
    });
    return page;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) {
      this.page = this.newPage();
      this.y = PAGE.height - MARGIN;
    }
  }

  text(
    text: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gapAfter?: number } = {},
  ) {
    const size = opts.size ?? BODY_SIZE;
    const font = opts.bold ? this.bold : this.regular;
    const lineHeight = size * 1.4;
    for (const line of wrapText(text, font, size, PAGE.width - 2 * MARGIN)) {
      this.ensure(lineHeight);
      if (line)
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y - size,
          size,
          font,
          color: opts.color ?? INK,
        });
      this.y -= lineHeight;
    }
    this.y -= opts.gapAfter ?? 0;
  }

  rule() {
    this.ensure(10);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 4 },
      end: { x: PAGE.width - MARGIN, y: this.y - 4 },
      thickness: 0.5,
      color: MUTED,
    });
    this.y -= 12;
  }

  /** Two-column "label: value" line; long values wrap under the label column. */
  keyValue(label: string, value: string) {
    const size = BODY_SIZE;
    const lineHeight = size * 1.4;
    const labelWidth = 150;
    const lines = wrapText(value || '—', this.regular, size, PAGE.width - 2 * MARGIN - labelWidth);
    this.ensure(lineHeight * lines.length);
    this.page.drawText(label, { x: MARGIN, y: this.y - size, size, font: this.bold, color: INK });
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN + labelWidth,
        y: this.y - size,
        size,
        font: this.regular,
        color: INK,
      });
      this.y -= lineHeight;
    }
  }

  /** Right-aligned image block with caption lines under it (used for physician signatures). */
  async image(png: Buffer, caption: string[], maxWidth = 200, maxHeight = 60) {
    const embedded = await this.doc.embedPng(png);
    const scaled = embedded.scaleToFit(maxWidth, maxHeight);
    const boxHeight = scaled.height + caption.length * LINE_HEIGHT + 12;
    this.ensure(boxHeight);
    const x = PAGE.width - MARGIN - maxWidth;
    const top = this.y;
    this.page.drawImage(embedded, {
      x,
      y: top - scaled.height,
      width: scaled.width,
      height: scaled.height,
    });
    let y = top - scaled.height - 4 - BODY_SIZE;
    for (const line of caption) {
      this.page.drawText(line, { x, y, size: BODY_SIZE - 1, font: this.regular, color: INK });
      y -= LINE_HEIGHT;
    }
    this.y = top - boxHeight;
  }

  async signature(block: SignatureBlock) {
    const png = await this.doc.embedPng(block.signaturePng);
    const scaled = png.scaleToFit(220, 70);
    const boxHeight = scaled.height + 4 * LINE_HEIGHT + 16;
    this.ensure(boxHeight);
    const top = this.y;
    const x = PAGE.width - MARGIN - 240;
    this.page.drawText('İmza', {
      x,
      y: top - BODY_SIZE,
      size: BODY_SIZE,
      font: this.bold,
      color: INK,
    });
    this.page.drawImage(png, {
      x,
      y: top - LINE_HEIGHT - scaled.height - 4,
      width: scaled.width,
      height: scaled.height,
    });
    this.page.drawLine({
      start: { x, y: top - LINE_HEIGHT - scaled.height - 8 },
      end: { x: x + 220, y: top - LINE_HEIGHT - scaled.height - 8 },
      thickness: 0.5,
      color: INK,
    });
    let y = top - LINE_HEIGHT - scaled.height - 10 - BODY_SIZE;
    for (const line of [
      block.signerName,
      `Tarih: ${formatIstanbul(block.signedAt)}`,
      `Alan personel: ${block.collectorName}`,
    ]) {
      this.page.drawText(line, { x, y, size: BODY_SIZE - 1, font: this.regular, color: INK });
      y -= LINE_HEIGHT;
    }
    this.y = top - boxHeight;
  }
}

/** Renders a KVKK consent text with the patient block and the signature into a fresh A4 PDF. */
/** Fresh A4 document with the Turkish-capable fonts embedded and a footer on every page. */
export async function createWriter(meta: {
  title: string;
  subject?: string;
  footer: string;
}): Promise<{ doc: PDFDocument; writer: Writer }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular, bold } = fonts();
  const regularFont = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold, { subset: true });
  doc.setTitle(meta.title);
  if (meta.subject) doc.setSubject(meta.subject);
  doc.setCreator('OSGB Platform');
  return { doc, writer: new Writer(doc, regularFont, boldFont, meta.footer) };
}

export async function buildConsentPdf(input: ConsentFormInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const { regular, bold } = fonts();
  const regularFont = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold, { subset: true });
  doc.setTitle(input.title);
  doc.setSubject(`${input.patient.fullName} · ${input.organizationName}`);
  doc.setCreator('OSGB Platform · Belge İmza');

  const footer = `Belge No: ${input.signature.documentNo} · Sürüm v${input.version} · ${input.organizationName}`;
  const w = new Writer(doc, regularFont, boldFont, footer);
  w.text(input.organizationName, { size: 9, color: MUTED });
  w.text(input.title, { size: 14, bold: true, gapAfter: 4 });
  w.text(`Sürüm v${input.version}`, { size: 8, color: MUTED, gapAfter: 6 });
  w.rule();
  w.text(
    [
      `Ad Soyad: ${input.patient.fullName}`,
      input.patient.nationalId ? `T.C. Kimlik No: ${input.patient.nationalId}` : null,
      input.patient.birthDate ? `Doğum Tarihi: ${formatDateOnly(input.patient.birthDate)}` : null,
    ]
      .filter(Boolean)
      .join('    '),
    { gapAfter: 8 },
  );
  w.rule();
  w.text(input.body, { gapAfter: 18 });
  await w.signature(input.signature);
  return Buffer.from(await doc.save());
}

/** Stamps the signature block onto the last page of an existing PDF (adds a page when there is no room). */
export async function stampPdf(pdf: Buffer, block: SignatureBlock): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: false });
  doc.registerFontkit(fontkit);
  const { regular, bold } = fonts();
  const regularFont = await doc.embedFont(regular, { subset: true });
  const boldFont = await doc.embedFont(bold, { subset: true });
  const png = await doc.embedPng(block.signaturePng);
  const scaled = png.scaleToFit(200, 60);
  const needed = scaled.height + 4 * LINE_HEIGHT + 24;

  const pages = doc.getPages();
  let page = pages[pages.length - 1]!;
  // No reliable way to know where the content ends; use the bottom margin and fall back to a new page when it is tiny.
  if (page.getSize().height < needed + 2 * MARGIN) page = doc.addPage([PAGE.width, PAGE.height]);
  const { width } = page.getSize();
  const x = width - MARGIN - 220;
  let y = MARGIN + needed;
  page.drawText('İmza', { x, y: y - BODY_SIZE, size: BODY_SIZE, font: boldFont, color: INK });
  y -= LINE_HEIGHT + scaled.height + 4;
  page.drawImage(png, { x, y, width: scaled.width, height: scaled.height });
  page.drawLine({
    start: { x, y: y - 4 },
    end: { x: x + 200, y: y - 4 },
    thickness: 0.5,
    color: INK,
  });
  y -= 6 + BODY_SIZE;
  for (const line of [
    block.signerName,
    `Tarih: ${formatIstanbul(block.signedAt)}`,
    `Alan personel: ${block.collectorName}`,
  ]) {
    page.drawText(line, { x, y, size: BODY_SIZE - 1, font: regularFont, color: INK });
    y -= LINE_HEIGHT;
  }
  page.drawText(`Belge No: ${block.documentNo}`, {
    x: MARGIN,
    y: MARGIN / 2,
    size: 7,
    font: regularFont,
    color: MUTED,
  });
  return Buffer.from(await doc.save());
}

export async function pageCount(pdf: Buffer): Promise<number> {
  return (await PDFDocument.load(pdf)).getPageCount();
}
