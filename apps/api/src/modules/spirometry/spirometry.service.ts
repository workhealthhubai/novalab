import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ageAt, analyzeSpirometry, AuditAction, type SpirometryAnalysis } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { DocumentsService, type UploadedFileLike } from '@/modules/documents/documents.service';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import type {
  CreateSpirometryDto,
  SpirometryQueryDto,
  UpdateSpirometryDto,
} from './dto/spirometry.dtos';

const testInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nationalId: true,
      birthDate: true,
      gender: true,
    },
  },
  protocol: { select: { id: true, protocolNumber: true, type: true, status: true } },
  performedBy: { select: { id: true, firstName: true, lastName: true } },
  document: {
    select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
  },
} satisfies Prisma.SpirometryTestInclude;

type TestRow = Prisma.SpirometryTestGetPayload<{ include: typeof testInclude }>;

const DECIMAL_FIELDS = [
  'weightKg',
  'fvc',
  'fev1',
  'ratio',
  'pef',
  'fef2575',
  'fvcPredicted',
  'fev1Predicted',
  'postFvc',
  'postFev1',
] as const;
const TRACE_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}
function num(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

/** Row → API shape: decimals as numbers plus the derived analysis. */
function present(row: TestRow, baselineFev1: number | null = null) {
  const numbers = Object.fromEntries(DECIMAL_FIELDS.map((f) => [f, num(row[f])])) as Record<
    (typeof DECIMAL_FIELDS)[number],
    number | null
  >;
  const analysis: SpirometryAnalysis = analyzeSpirometry(
    numbers,
    {
      sex: row.employee.gender,
      heightCm: row.heightCm,
      ageYears: ageAt(row.employee.birthDate, row.performedAt),
    },
    baselineFev1,
  );
  return { ...row, ...numbers, analysis };
}

export type SpirometryTestView = ReturnType<typeof present>;

/** Spirometri: SFT records with derived interpretation, printouts and protocol hand-off. */
@Injectable()
export class SpirometryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SpirometryService.name);
  }

  async list(tenantId: string, query: SpirometryQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.SpirometryTestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.pattern ? { pattern: query.pattern } : {}),
      ...(query.from || query.to
        ? {
            performedAt: {
              ...(query.from ? { gte: dayStart(query.from) } : {}),
              ...(query.to ? { lte: dayEnd(query.to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            employee: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { nationalId: { startsWith: search } },
              ],
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.spirometryTest.findMany({
        where,
        include: testInclude,
        orderBy: { performedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.spirometryTest.count({ where }),
    ]);
    return paginate(
      rows.map((r) => present(r)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(
    tenantId: string,
    id: string,
  ): Promise<
    SpirometryTestView & { baseline: { id: string; performedAt: Date; fev1: number | null } | null }
  > {
    const row = await this.row(tenantId, id);
    const baseline = row.isBaseline ? null : await this.baselineFor(tenantId, row);
    return { ...present(row, baseline?.fev1 ?? null), baseline };
  }

  /** FEV1 / FVC % predicted trend of a patient, oldest first. */
  async history(tenantId: string, employeeId: string) {
    const rows = await this.prisma.spirometryTest.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      include: testInclude,
      orderBy: { performedAt: 'asc' },
    });
    return rows.map((r) => {
      const v = present(r);
      return {
        id: r.id,
        performedAt: r.performedAt,
        isBaseline: r.isBaseline,
        fev1: v.fev1,
        fvc: v.fvc,
        fev1Percent: v.analysis.fev1Percent,
        fvcPercent: v.analysis.fvcPercent,
        ratio: v.analysis.ratio,
        pattern: r.pattern ?? v.analysis.pattern,
        protocol: r.protocol,
      };
    });
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateSpirometryDto,
    ctx: RequestContext,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee)
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    if (dto.protocolId) await this.assertProtocol(tenantId, dto.protocolId, employee.id);
    this.assertValues(dto);
    const { employeeId, performedAt, ...fields } = dto;
    const row = await this.prisma.spirometryTest.create({
      data: {
        tenantId,
        employeeId,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        performedById: actor.id,
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      },
      include: testInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'SpirometryTest',
      entityId: row.id,
      newValue: {
        employeeId,
        protocolId: row.protocolId,
        isBaseline: row.isBaseline,
        performedAt: row.performedAt,
      },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return this.get(tenantId, row.id);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateSpirometryDto,
    ctx: RequestContext,
  ) {
    const before = await this.row(tenantId, id);
    if (dto.protocolId) await this.assertProtocol(tenantId, dto.protocolId, before.employeeId);
    this.assertValues({
      ...Object.fromEntries(DECIMAL_FIELDS.map((f) => [f, num(before[f])])),
      ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)),
    });
    const { performedAt, ...fields } = dto as UpdateSpirometryDto & { employeeId?: string };
    delete fields.employeeId;
    const row = await this.prisma.spirometryTest.update({
      where: { id },
      data: {
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
        ...(performedAt !== undefined ? { performedAt: new Date(performedAt) } : {}),
      },
      include: testInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'SpirometryTest',
      entityId: id,
      newValue: { changedFields: Object.keys(fields) },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return this.get(tenantId, id);
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.row(tenantId, id);
    await this.prisma.spirometryTest.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'SpirometryTest',
      entityId: id,
      oldValue: { employeeId: before.employeeId },
      ...ctx,
    });
  }

  async attachTrace(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    file: UploadedFileLike | undefined,
    ctx: RequestContext,
  ) {
    const before = await this.row(tenantId, id);
    if (!file)
      throw new BadRequestException({ message: 'Missing file', errorCode: 'FILE_REQUIRED' });
    if (!TRACE_MIME_TYPES.has(file.mimetype))
      throw new BadRequestException({
        message: 'Only PDF, PNG, JPEG or WebP printouts are accepted',
        errorCode: 'UNSUPPORTED_FILE_TYPE',
      });
    const document = await this.documents.upload(
      tenantId,
      actor,
      file,
      { category: 'SPIROMETRY_TRACE', isMedical: true, employeeId: before.employeeId },
      ctx,
    );
    await this.prisma.spirometryTest.update({ where: { id }, data: { documentId: document.id } });
    if (before.documentId)
      await this.documents.remove(tenantId, actor, before.documentId, ctx).catch(() => undefined);
    return this.get(tenantId, id);
  }

  async traceUrl(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const row = await this.row(tenantId, id);
    if (!row.documentId)
      throw new NotFoundException({
        message: 'No printout attached',
        errorCode: 'TRACE_NOT_FOUND',
      });
    return this.documents.getDownloadUrl(tenantId, actor, row.documentId, ctx);
  }

  /* ------------------------------------------------------------- helpers */

  private async row(tenantId: string, id: string): Promise<TestRow> {
    const row = await this.prisma.spirometryTest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: testInclude,
    });
    if (!row)
      throw new NotFoundException({
        message: 'Spirometry test not found',
        errorCode: 'SPIROMETRY_NOT_FOUND',
      });
    return row;
  }

  /** Latest test flagged as baseline before this one, else the earliest earlier test. */
  private async baselineFor(tenantId: string, row: TestRow) {
    const earlier = await this.prisma.spirometryTest.findMany({
      where: {
        tenantId,
        employeeId: row.employeeId,
        deletedAt: null,
        id: { not: row.id },
        performedAt: { lte: row.performedAt },
      },
      select: { id: true, performedAt: true, isBaseline: true, fev1: true },
      orderBy: { performedAt: 'asc' },
    });
    const pick = [...earlier].reverse().find((t) => t.isBaseline) ?? earlier[0] ?? null;
    return pick ? { id: pick.id, performedAt: pick.performedAt, fev1: num(pick.fev1) } : null;
  }

  private assertValues(v: {
    fvc?: number | null;
    fev1?: number | null;
    postFvc?: number | null;
    postFev1?: number | null;
  }) {
    if (v.fvc && v.fev1 && v.fev1 > v.fvc)
      throw new BadRequestException({
        message: 'FEV1 cannot exceed FVC',
        errorCode: 'SPIROMETRY_INVALID',
      });
    if (v.postFvc && v.postFev1 && v.postFev1 > v.postFvc)
      throw new BadRequestException({
        message: 'Post-BD FEV1 cannot exceed post-BD FVC',
        errorCode: 'SPIROMETRY_INVALID',
      });
    if (!v.fvc && !v.fev1)
      throw new BadRequestException({
        message: 'FVC or FEV1 is required',
        errorCode: 'SPIROMETRY_EMPTY',
      });
  }

  private async assertProtocol(tenantId: string, protocolId: string, employeeId: string) {
    const protocol = await this.prisma.protocol.findFirst({
      where: { id: protocolId, tenantId, deletedAt: null },
      select: { employeeId: true },
    });
    if (!protocol || protocol.employeeId !== employeeId)
      throw new BadRequestException({
        message: 'Protocol does not belong to this patient',
        errorCode: 'PROTOCOL_MISMATCH',
      });
  }

  /** Completes the protocol's SPIROMETRY item and mirrors FEV1 % / FVC % / ratio into the examination. Best effort. */
  private async handOff(
    tenantId: string,
    actor: AuthenticatedUser,
    row: TestRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find((i) => i.type === 'SPIROMETRY' && i.status === 'PENDING');
      if (item)
        await this.protocols.updateItem(
          tenantId,
          actor,
          protocol.id,
          item.id,
          { status: 'DONE' },
          ctx,
        );
    } catch (error) {
      this.logger.warn(
        { err: error, protocolId: row.protocolId },
        'spirometry: protocol item not completed',
      );
    }
    try {
      const examination = await this.prisma.examination.findFirst({
        where: {
          tenantId,
          protocolId: row.protocolId,
          deletedAt: null,
          status: { not: 'APPROVED' },
        },
        select: { id: true },
      });
      if (!examination) return;
      const { analysis } = present(row);
      const values: Array<[string, number | null]> = [
        ['FEV1', analysis.fev1Percent],
        ['FVC', analysis.fvcPercent],
        ['FEV1_FVC', analysis.ratio === null ? null : Math.round(analysis.ratio)],
      ];
      const now = new Date();
      for (const [key, value] of values) {
        if (value === null) continue;
        await this.prisma.examinationMeasurement.upsert({
          where: { examinationId_key: { examinationId: examination.id, key } },
          create: {
            tenantId,
            examinationId: examination.id,
            key,
            value,
            recordedAt: now,
            recordedById: actor.id,
          },
          update: { value, recordedAt: now, recordedById: actor.id },
        });
      }
    } catch (error) {
      this.logger.warn(
        { err: error, protocolId: row.protocolId },
        'spirometry: measurements not mirrored',
      );
    }
  }
}
