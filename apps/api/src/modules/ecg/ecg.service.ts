import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { analyzeEcg, AuditAction, type EcgAnalysis } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { DocumentsService, type UploadedFileLike } from '@/modules/documents/documents.service';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import type { CreateEcgDto, EcgQueryDto, UpdateEcgDto } from './dto/ecg.dtos';

const ecgInclude = {
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
} satisfies Prisma.EcgRecordInclude;

type EcgRow = Prisma.EcgRecordGetPayload<{ include: typeof ecgInclude }>;

const TRACE_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}

function withAnalysis(row: EcgRow): EcgRow & { analysis: EcgAnalysis } {
  return { ...row, analysis: analyzeEcg(row, row.employee.gender) };
}

export type EcgRecordView = ReturnType<typeof withAnalysis>;

/** EKG: structured resting ECG records, derived flags, device printouts, protocol hand-off. */
@Injectable()
export class EcgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly documents: DocumentsService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EcgService.name);
  }

  async list(tenantId: string, query: EcgQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.EcgRecordWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.interpretation ? { interpretation: query.interpretation } : {}),
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
      this.prisma.ecgRecord.findMany({
        where,
        include: ecgInclude,
        orderBy: { performedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ecgRecord.count({ where }),
    ]);
    return paginate(rows.map(withAnalysis), query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<EcgRecordView> {
    return withAnalysis(await this.row(tenantId, id));
  }

  /** Rate / QTc trend of a patient, oldest first. */
  async history(tenantId: string, employeeId: string) {
    const rows = await this.prisma.ecgRecord.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      include: ecgInclude,
      orderBy: { performedAt: 'asc' },
    });
    return rows.map((r) => {
      const analysis = analyzeEcg(r, r.employee.gender);
      return {
        id: r.id,
        performedAt: r.performedAt,
        heartRate: r.heartRate,
        qtc: analysis.qtc,
        interpretation: r.interpretation,
        protocol: r.protocol,
        flags: analysis.flags,
      };
    });
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateEcgDto,
    ctx: RequestContext,
  ): Promise<EcgRecordView> {
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
    const row = await this.prisma.ecgRecord.create({
      data: {
        tenantId,
        employeeId: employee.id,
        protocolId: dto.protocolId ?? null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
        performedById: actor.id,
        deviceName: dto.deviceName ?? null,
        heartRate: dto.heartRate ?? null,
        rhythm: dto.rhythm ?? null,
        prInterval: dto.prInterval ?? null,
        qrsDuration: dto.qrsDuration ?? null,
        qtInterval: dto.qtInterval ?? null,
        qtcInterval: dto.qtcInterval ?? null,
        axis: dto.axis ?? null,
        findings: [...new Set(dto.findings ?? [])],
        interpretation: dto.interpretation ?? 'NORMAL',
        comment: dto.comment ?? null,
      },
      include: ecgInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'EcgRecord',
      entityId: row.id,
      newValue: {
        employeeId: employee.id,
        protocolId: row.protocolId,
        interpretation: row.interpretation,
        performedAt: row.performedAt,
      },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return withAnalysis(row);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateEcgDto,
    ctx: RequestContext,
  ): Promise<EcgRecordView> {
    const before = await this.row(tenantId, id);
    if (dto.protocolId) await this.assertProtocol(tenantId, dto.protocolId, before.employeeId);
    const { employeeId: _ignored, ...fields } = dto as UpdateEcgDto & { employeeId?: string };
    void _ignored;
    const row = await this.prisma.ecgRecord.update({
      where: { id },
      data: {
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
        ...(dto.performedAt !== undefined ? { performedAt: new Date(dto.performedAt) } : {}),
        ...(dto.findings !== undefined ? { findings: [...new Set(dto.findings)] } : {}),
      },
      include: ecgInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'EcgRecord',
      entityId: id,
      oldValue: { interpretation: before.interpretation },
      newValue: { interpretation: row.interpretation, changedFields: Object.keys(fields) },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return withAnalysis(row);
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.row(tenantId, id);
    await this.prisma.ecgRecord.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'EcgRecord',
      entityId: id,
      oldValue: { employeeId: before.employeeId },
      ...ctx,
    });
  }

  /** Stores the device printout as an ECG_TRACE document and links it (replacing a previous one). */
  async attachTrace(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    file: UploadedFileLike | undefined,
    ctx: RequestContext,
  ): Promise<EcgRecordView> {
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
      { category: 'ECG_TRACE', isMedical: true, employeeId: before.employeeId },
      ctx,
    );
    const row = await this.prisma.ecgRecord.update({
      where: { id },
      data: { documentId: document.id },
      include: ecgInclude,
    });
    if (before.documentId)
      await this.documents.remove(tenantId, actor, before.documentId, ctx).catch(() => undefined);
    return withAnalysis(row);
  }

  /** Presigned link to the printout (audited as an export by the documents service). */
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

  private async row(tenantId: string, id: string): Promise<EcgRow> {
    const row = await this.prisma.ecgRecord.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: ecgInclude,
    });
    if (!row)
      throw new NotFoundException({ message: 'ECG record not found', errorCode: 'ECG_NOT_FOUND' });
    return row;
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

  /** Completes the protocol's ECG item and mirrors the heart rate as the examination PULSE. Best effort. */
  private async handOff(
    tenantId: string,
    actor: AuthenticatedUser,
    row: EcgRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find((i) => i.type === 'ECG' && i.status === 'PENDING');
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
        'ecg: protocol item not completed',
      );
    }
    if (row.heartRate === null) return;
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
      await this.prisma.examinationMeasurement.upsert({
        where: { examinationId_key: { examinationId: examination.id, key: 'PULSE' } },
        create: {
          tenantId,
          examinationId: examination.id,
          key: 'PULSE',
          value: row.heartRate,
          recordedAt: new Date(),
          recordedById: actor.id,
        },
        update: { value: row.heartRate, recordedAt: new Date(), recordedById: actor.id },
      });
    } catch (error) {
      this.logger.warn({ err: error, protocolId: row.protocolId }, 'ecg: pulse not mirrored');
    }
  }
}
