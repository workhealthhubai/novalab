/**
 * Shared helpers for the demo seed: deterministic ids, dates, Turkish identity numbers, generated
 * images (sharp) and thin MinIO / Orthanc clients that read the same env vars as the API.
 */
import { createHash } from 'node:crypto';
import { Client as MinioClient } from 'minio';
import sharp from 'sharp';

// ----------------------------- deterministic ids -----------------------------

/** Stable UUID (v4 layout) derived from a name, so re-seeding produces the same ids/links. */
export function uid(name: string): string {
  const h = createHash('sha1').update(`osgb-demo:${name}`).digest('hex');
  const variant = ['8', '9', 'a', 'b'][parseInt(h[16]!, 16) % 4];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Deterministic pseudo random in [0, 1) for a key (keeps generated numbers stable between runs). */
export function rand(key: string): number {
  const h = createHash('md5').update(key).digest();
  return h.readUInt32BE(0) / 0x1_0000_0000;
}

export function pick<T>(key: string, items: readonly T[]): T {
  return items[Math.floor(rand(key) * items.length)]!;
}

export function between(key: string, min: number, max: number, decimals = 0): number {
  const v = min + rand(key) * (max - min);
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

// ----------------------------- dates -----------------------------------------

export const NOW = new Date();

export function daysAgo(days: number, hour = 9, minute = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function daysAhead(days: number, hour = 9, minute = 0): Date {
  return daysAgo(-days, hour, minute);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Date-only value (Prisma @db.Date) - noon UTC avoids timezone day shifts. */
export function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function yearsAgoDate(years: number, month: number, day: number): Date {
  return dateOnly(NOW.getFullYear() - years, month, day);
}

// ----------------------------- identity ----------------------------------------

/** Valid T.C. Kimlik No (checksum rules) derived deterministically from a key. */
export function tcKimlikNo(key: string): string {
  const digits: number[] = [];
  const h = createHash('sha256').update(`tc:${key}`).digest('hex');
  for (let i = 0; digits.length < 9; i += 1) {
    const d = parseInt(h[i]!, 16) % 10;
    if (digits.length === 0 && d === 0) continue;
    digits.push(d);
  }
  const odd = digits[0]! + digits[2]! + digits[4]! + digits[6]! + digits[8]!;
  const even = digits[1]! + digits[3]! + digits[5]! + digits[7]!;
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = (digits.reduce((a, b) => a + b, 0) + d10) % 10;
  return [...digits, d10, d11].join('');
}

/** 10-digit GSM number starting with 5 (stored without country code). */
export function gsm(key: string): string {
  const h = createHash('md5').update(`gsm:${key}`).digest('hex');
  const n = parseInt(h.slice(0, 12), 16) % 1_000_000_000;
  return `5${String(n).padStart(9, '0')}`;
}

export function landline(key: string, areaCode = '212'): string {
  const h = createHash('md5').update(`tel:${key}`).digest('hex');
  const n = parseInt(h.slice(0, 12), 16) % 10_000_000;
  return `${areaCode}${String(n).padStart(7, '0')}`;
}

/** Turkish-aware lower-casing used for Occupation.nameKey (mirrors occupation-name.ts). */
export function trLower(value: string): string {
  return value.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr-TR').trim();
}

// ----------------------------- images -----------------------------------------

const PALETTE = ['#0f766e', '#1d4ed8', '#b45309', '#be123c', '#4d7c0f', '#6d28d9', '#0369a1'];

/** Portrait placeholder: initials on a coloured background, JPEG 400x400. */
export async function portraitJpeg(firstName: string, lastName: string): Promise<Buffer> {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toLocaleUpperCase('tr-TR');
  const color = pick(`${firstName}${lastName}`, PALETTE);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <rect width="400" height="400" fill="${color}"/>
  <circle cx="200" cy="150" r="70" fill="rgba(255,255,255,0.25)"/>
  <ellipse cx="200" cy="330" rx="130" ry="90" fill="rgba(255,255,255,0.25)"/>
  <text x="200" y="228" font-family="Helvetica, Arial, sans-serif" font-size="150" font-weight="700"
        fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

/** Handwriting-like stroke used for physician and patient signatures (transparent PNG). */
export async function signaturePng(name: string, width = 800, height = 300): Promise<Buffer> {
  const seed = rand(`sig:${name}`);
  const points: string[] = [];
  const n = 14 + Math.floor(seed * 6);
  for (let i = 0; i <= n; i += 1) {
    const x = 40 + (i / n) * (width - 80);
    const y = height / 2 + Math.sin(i * 1.7 + seed * 6) * (height * 0.28) * (i % 2 ? 1 : -0.6);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const [first, ...rest] = points;
  let d = `M ${first}`;
  for (let i = 0; i < rest.length - 1; i += 2) {
    const c = rest[i]!;
    const p = rest[i + 1] ?? rest[i]!;
    d += ` Q ${c} ${p}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <path d="${d}" fill="none" stroke="#1e293b" stroke-width="${Math.max(3, width / 160)}"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${width * 0.15} ${height * 0.78} L ${width * 0.85} ${height * 0.72}" fill="none"
        stroke="#1e293b" stroke-width="${Math.max(2, width / 260)}" stroke-linecap="round"/>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Organisation logo, PNG 480x160. */
export async function logoPng(name: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160">
  <rect width="480" height="160" rx="16" fill="#0f766e"/>
  <circle cx="80" cy="80" r="46" fill="#ffffff"/>
  <path d="M80 48 v64 M48 80 h64" stroke="#0f766e" stroke-width="14" stroke-linecap="round"/>
  <text x="150" y="72" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${name}</text>
  <text x="150" y="112" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#ccfbf1">Ortak Sağlık ve Güvenlik Birimi</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** ECG / spirometry style trace on millimetre paper, PNG. */
export async function tracePng(kind: 'ecg' | 'spirometry', title: string): Promise<Buffer> {
  const width = 1200;
  const height = 500;
  const grid: string[] = [];
  for (let x = 0; x <= width; x += 20)
    grid.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${x % 100 ? '#fecaca' : '#f87171'}" stroke-width="${x % 100 ? 0.5 : 1}"/>`,
    );
  for (let y = 0; y <= height; y += 20)
    grid.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${y % 100 ? '#fecaca' : '#f87171'}" stroke-width="${y % 100 ? 0.5 : 1}"/>`,
    );
  const pts: string[] = [];
  if (kind === 'ecg') {
    for (let x = 0; x <= width; x += 2) {
      const t = (x % 200) / 200;
      let y = 0;
      if (t > 0.1 && t < 0.2) y = -12 * Math.sin(((t - 0.1) / 0.1) * Math.PI);
      if (t > 0.3 && t < 0.32) y = 15;
      if (t >= 0.32 && t < 0.36) y = -120;
      if (t >= 0.36 && t < 0.39) y = 30;
      if (t > 0.5 && t < 0.68) y = -25 * Math.sin(((t - 0.5) / 0.18) * Math.PI);
      pts.push(`${x},${250 + y}`);
    }
  } else {
    for (let x = 0; x <= width; x += 2) {
      const t = x / width;
      const y = t < 0.15 ? 0 : -300 * (1 - Math.exp(-(t - 0.15) * 6));
      pts.push(`${x},${420 + y}`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#fff7f7"/>
  ${grid.join('\n')}
  <polyline points="${pts.join(' ')}" fill="none" stroke="#111827" stroke-width="2"/>
  <text x="20" y="34" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#111827">${title}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ----------------------------- MinIO -----------------------------------------

export interface SeedStorage {
  bucket: string;
  put(key: string, body: Buffer, contentType: string): Promise<{ etag: string }>;
  wipe(): Promise<number>;
}

export function createStorage(): SeedStorage | null {
  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  if (!endPoint || !accessKey || !secretKey) return null;
  const bucket = process.env.MINIO_BUCKET ?? 'osgb-documents';
  const region = process.env.MINIO_REGION ?? 'us-east-1';
  const client = new MinioClient({
    endPoint,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey,
    secretKey,
    region,
  });
  return {
    bucket,
    async put(key, body, contentType) {
      if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket, region);
      const result = await client.putObject(bucket, key, body, body.length, {
        'Content-Type': contentType,
      });
      return { etag: result.etag };
    },
    async wipe() {
      if (!(await client.bucketExists(bucket))) return 0;
      const keys: string[] = [];
      await new Promise<void>((resolveList, reject) => {
        client
          .listObjectsV2(bucket, '', true)
          .on('data', (obj) => obj.name && keys.push(obj.name))
          .on('error', reject)
          .on('end', () => resolveList());
      });
      for (let i = 0; i < keys.length; i += 500) {
        await client.removeObjects(bucket, keys.slice(i, i + 500));
      }
      return keys.length;
    },
  };
}

// ----------------------------- Orthanc ---------------------------------------

export interface SeedOrthanc {
  uploadInstance(dicom: Buffer): Promise<{
    ID: string;
    ParentStudy: string;
    ParentSeries: string;
    ParentPatient: string;
  }>;
  wipe(): Promise<number>;
}

export function createOrthanc(): SeedOrthanc | null {
  const url = process.env.ORTHANC_URL;
  const user = process.env.ORTHANC_USERNAME;
  const password = process.env.ORTHANC_PASSWORD;
  if (!url || !user || !password) return null;
  const auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  const base = url.replace(/\/$/, '');
  const request = async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { Authorization: auth, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(`Orthanc ${init.method ?? 'GET'} ${path} → HTTP ${response.status}`);
    return response;
  };
  return {
    async uploadInstance(dicom) {
      const response = await request('/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/dicom' },
        body: new Uint8Array(dicom),
      });
      return (await response.json()) as {
        ID: string;
        ParentStudy: string;
        ParentSeries: string;
        ParentPatient: string;
      };
    },
    async wipe() {
      const patients = (await (await request('/patients')).json()) as string[];
      for (const id of patients) await request(`/patients/${id}`, { method: 'DELETE' });
      return patients.length;
    },
  };
}
