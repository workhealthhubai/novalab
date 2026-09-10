/**
 * Minimal DICOM Part-10 writer (Explicit VR Little Endian) producing a synthetic 8-bit chest
 * radiograph. Only used by the demo seed so the radiology module has real studies in Orthanc;
 * nothing here is meant for clinical use.
 */
import { createHash } from 'node:crypto';

const UID_ROOT = '1.2.826.0.1.3680043.10.1071';
const CR_IMAGE_STORAGE = '1.2.840.10008.5.1.4.1.1.1';
const EXPLICIT_VR_LE = '1.2.840.10008.1.2.1';
const IMPLEMENTATION_UID = `${UID_ROOT}.1`;

/** Deterministic UID (≤64 chars) for a name. */
export function dicomUid(name: string): string {
  const h = createHash('sha1').update(`uid:${name}`).digest('hex');
  const digits = BigInt(`0x${h.slice(0, 24)}`)
    .toString()
    .slice(0, 28);
  return `${UID_ROOT}.${digits.replace(/^0+/, '') || '1'}`;
}

type Vr = 'AE' | 'CS' | 'DA' | 'IS' | 'LO' | 'OB' | 'PN' | 'SH' | 'TM' | 'UI' | 'UL' | 'US';

interface Element {
  tag: number;
  vr: Vr;
  value: Buffer;
}

function text(value: string, pad = ' '): Buffer {
  const b = Buffer.from(value, 'latin1');
  return b.length % 2 ? Buffer.concat([b, Buffer.from(pad)]) : b;
}

function el(tag: number, vr: Vr, value: string | number | Buffer): Element {
  if (Buffer.isBuffer(value)) return { tag, vr, value };
  if (vr === 'US') {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(Number(value));
    return { tag, vr, value: b };
  }
  if (vr === 'UL') {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(Number(value));
    return { tag, vr, value: b };
  }
  return { tag, vr, value: text(String(value), vr === 'UI' ? '\0' : ' ') };
}

function encode(elements: Element[]): Buffer {
  const parts: Buffer[] = [];
  for (const e of [...elements].sort((a, b) => a.tag - b.tag)) {
    const head = Buffer.alloc(e.vr === 'OB' ? 12 : 8);
    head.writeUInt16LE(e.tag >>> 16, 0);
    head.writeUInt16LE(e.tag & 0xffff, 2);
    head.write(e.vr, 4, 'ascii');
    if (e.vr === 'OB') {
      head.writeUInt16LE(0, 6);
      head.writeUInt32LE(e.value.length, 8);
    } else {
      head.writeUInt16LE(e.value.length, 6);
    }
    parts.push(head, e.value);
  }
  return Buffer.concat(parts);
}

export interface ChestImageOptions {
  rows?: number;
  columns?: number;
  /** 0..1 - adds small rounded opacities (for the pneumoconiosis demo). */
  opacityDensity?: number;
  seed: string;
}

/** Synthetic PA chest radiograph: body, two lung fields, spine, ribs, optional nodules, noise. */
export function chestPixels(options: ChestImageOptions): {
  rows: number;
  columns: number;
  data: Buffer;
} {
  const rows = options.rows ?? 256;
  const columns = options.columns ?? 256;
  const data = Buffer.alloc(rows * columns);
  const noise = createHash('sha256').update(options.seed).digest();
  const nodules: Array<[number, number]> = [];
  const density = options.opacityDensity ?? 0;
  for (let i = 0; i < Math.round(density * 40); i += 1) {
    const a = noise[(i * 2) % noise.length]! / 255;
    const b = noise[(i * 2 + 1) % noise.length]! / 255;
    nodules.push([columns * (0.2 + a * 0.6), rows * (0.25 + b * 0.5)]);
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const nx = (x - columns / 2) / (columns / 2);
      const ny = (y - rows / 2) / (rows / 2);
      let v = 30;
      if (nx * nx + (ny * ny) / 1.25 < 0.95) v = 135; // thorax
      const lungL = ((nx + 0.42) / 0.36) ** 2 + ((ny + 0.05) / 0.62) ** 2;
      const lungR = ((nx - 0.42) / 0.36) ** 2 + ((ny + 0.05) / 0.62) ** 2;
      if (lungL < 1 || lungR < 1) v = 70;
      if (Math.abs(nx) < 0.08 && ny > -0.75 && ny < 0.9) v = 185; // spine
      if (Math.abs(nx) < 0.3 && ny > -0.1 && ny < 0.55 && lungL >= 1 && lungR >= 1) v = 160; // heart
      const rib = Math.sin(ny * 14 + Math.abs(nx) * 2.2);
      if (rib > 0.85 && Math.abs(nx) > 0.12 && Math.abs(nx) < 0.9 && ny > -0.7 && ny < 0.6) v += 40;
      for (const [cx, cy] of nodules) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < 9) v += 45;
      }
      v += (noise[(x * 7 + y * 13) % noise.length]! % 17) - 8;
      data[y * columns + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  return { rows, columns, data };
}

export interface DicomStudyInput {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  patientId: string;
  /** DICOM PN: "SOYAD^AD". */
  patientName: string;
  /** yyyymmdd */
  patientBirthDate: string;
  patientSex: 'M' | 'F';
  studyDate: string;
  studyTime: string;
  accessionNumber: string;
  studyDescription: string;
  modality: 'CR' | 'DX';
  bodyPart: string;
  image: { rows: number; columns: number; data: Buffer };
}

export function buildDicom(input: DicomStudyInput): Buffer {
  const pixel =
    input.image.data.length % 2
      ? Buffer.concat([input.image.data, Buffer.alloc(1)])
      : input.image.data;
  const dataset = encode([
    el(0x00080005, 'CS', 'ISO_IR 100'),
    el(0x00080008, 'CS', 'ORIGINAL\\PRIMARY'),
    el(0x00080016, 'UI', CR_IMAGE_STORAGE),
    el(0x00080018, 'UI', input.sopInstanceUid),
    el(0x00080020, 'DA', input.studyDate),
    el(0x00080030, 'TM', input.studyTime),
    el(0x00080050, 'SH', input.accessionNumber),
    el(0x00080060, 'CS', input.modality),
    el(0x00080070, 'LO', 'OSGB Demo Imaging'),
    el(0x00080080, 'LO', 'Demo OSGB'),
    el(0x00081030, 'LO', input.studyDescription),
    el(0x0008103e, 'LO', `${input.bodyPart} PA`),
    el(0x00100010, 'PN', input.patientName),
    el(0x00100020, 'LO', input.patientId),
    el(0x00100030, 'DA', input.patientBirthDate),
    el(0x00100040, 'CS', input.patientSex),
    el(0x00180015, 'CS', input.bodyPart),
    el(0x0020000d, 'UI', input.studyInstanceUid),
    el(0x0020000e, 'UI', input.seriesInstanceUid),
    el(0x00200010, 'SH', input.accessionNumber),
    el(0x00200011, 'IS', '1'),
    el(0x00200013, 'IS', '1'),
    el(0x00280002, 'US', 1),
    el(0x00280004, 'CS', 'MONOCHROME2'),
    el(0x00280010, 'US', input.image.rows),
    el(0x00280011, 'US', input.image.columns),
    el(0x00280100, 'US', 8),
    el(0x00280101, 'US', 8),
    el(0x00280102, 'US', 7),
    el(0x00280103, 'US', 0),
    el(0x7fe00010, 'OB', pixel),
  ]);
  const metaBody = encode([
    el(0x00020001, 'OB', Buffer.from([0, 1])),
    el(0x00020002, 'UI', CR_IMAGE_STORAGE),
    el(0x00020003, 'UI', input.sopInstanceUid),
    el(0x00020010, 'UI', EXPLICIT_VR_LE),
    el(0x00020012, 'UI', IMPLEMENTATION_UID),
    el(0x00020013, 'SH', 'OSGB_SEED_1'),
  ]);
  const meta = encode([el(0x00020000, 'UL', metaBody.length)]);
  return Buffer.concat([Buffer.alloc(128), Buffer.from('DICM', 'ascii'), meta, metaBody, dataset]);
}
