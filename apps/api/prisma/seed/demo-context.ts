/**
 * Shared state for the demo seed: the tenant, users, physicians, lookup tables and helpers that
 * write documents to MinIO and rows to the audit trail.
 */
import * as argon2 from 'argon2';
import type { $Enums, Prisma, PrismaClient } from '../../src/generated/prisma/client';
import { createWriter } from '../../src/modules/signatures/pdf-builder';
import { NOW, type SeedOrthanc, type SeedStorage, uid } from './lib';

export interface DemoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface DemoContext {
  prisma: PrismaClient;
  storage: SeedStorage | null;
  orthanc: SeedOrthanc | null;
  tenantId: string;
  tenantName: string;
  passwordHash: string;
  users: Record<
    'admin' | 'physician' | 'radiologist' | 'nurse' | 'safety' | 'company' | 'clerk',
    DemoUser
  >;
  physicians: Record<'demir' | 'aksoy' | 'koc', { id: string; fullName: string }>;
  occupations: Map<string, string>;
  tests: Map<string, string>;
  provinces: Map<string, number>;
  districts: Map<string, number>;
  /** district id -> first neighborhood id (only when neighbourhoods were imported). */
  neighborhoods: Map<number, number>;
  requestCounter: number;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function loadLocations(prisma: PrismaClient) {
  const provinces = new Map<string, number>();
  const districts = new Map<string, number>();
  const neighborhoods = new Map<number, number>();
  for (const p of await prisma.province.findMany()) provinces.set(p.name, p.id);
  for (const d of await prisma.district.findMany({ include: { province: true } }))
    districts.set(`${d.province.name}/${d.name}`, d.id);
  const hoods = await prisma.neighborhood.findMany({
    distinct: ['districtId'],
    orderBy: { id: 'asc' },
    select: { districtId: true, id: true },
  });
  for (const n of hoods) neighborhoods.set(n.districtId, n.id);
  return { provinces, districts, neighborhoods };
}

export function requestId(ctx: DemoContext): string {
  ctx.requestCounter += 1;
  return uid(`request-${ctx.requestCounter}`);
}

export interface DocumentInput {
  key: string;
  category: $Enums.DocumentCategory;
  fileName: string;
  mimeType: string;
  body: Buffer;
  isMedical?: boolean;
  employeeId?: string | null;
  companyId?: string | null;
  examinationId?: string | null;
  uploadedById?: string | null;
  createdAt?: Date;
}

/** Uploads to MinIO and creates the Document row; returns null when storage is unavailable. */
export async function createDocument(ctx: DemoContext, input: DocumentInput) {
  if (!ctx.storage) return null;
  const objectKey = `${ctx.tenantId}/${input.key}`;
  const stored = await ctx.storage.put(objectKey, input.body, input.mimeType);
  return ctx.prisma.document.create({
    data: {
      id: uid(`document:${objectKey}`),
      tenantId: ctx.tenantId,
      category: input.category,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.body.length,
      bucket: ctx.storage.bucket,
      objectKey,
      checksum: stored.etag,
      isMedical: input.isMedical ?? false,
      employeeId: input.employeeId ?? null,
      companyId: input.companyId ?? null,
      examinationId: input.examinationId ?? null,
      uploadedById: input.uploadedById ?? ctx.users.admin.id,
      createdAt: input.createdAt ?? NOW,
    },
  });
}

/** Plain A4 PDF with a title and paragraphs (scanned forms, certificates, contracts …). */
export async function simplePdf(
  title: string,
  paragraphs: string[],
  footer: string,
): Promise<Buffer> {
  const { doc, writer } = await createWriter({ title, footer });
  writer.text(title, { size: 14, bold: true, gapAfter: 6 });
  writer.rule();
  for (const paragraph of paragraphs) writer.text(paragraph, { gapAfter: 8 });
  return Buffer.from(await doc.save());
}

export interface AuditInput {
  at: Date;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const USER_AGENTS = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  safariIpad:
    'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0',
};

export function auditRow(ctx: DemoContext, input: AuditInput): Prisma.AuditLogCreateManyInput {
  return {
    tenantId: ctx.tenantId,
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldValue: input.oldValue ?? undefined,
    newValue: input.newValue ?? undefined,
    ipAddress: input.ipAddress ?? '192.168.1.24',
    userAgent: input.userAgent ?? USER_AGENTS.chromeMac,
    requestId: requestId(ctx),
    metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    createdAt: input.at,
  };
}
