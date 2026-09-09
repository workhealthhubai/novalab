import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  analyzePneumoconiosis,
  AuditAction,
  type PneumoconiosisAnalysis,
} from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import type {
  CreateReadingDto,
  ReadingQueryDto,
  UpdateReadingDto,
} from './dto/pneumoconiosis.dtos';

const readingInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, nationalId: true, birthDate: true },
  },
  protocol: { select: { id: true, protocolNumber: true, type: true, status: true } },
  radiologyRequest: {
    select: {
      id: true,
      modality: true,
      bodyPart: true,
      requestedAt: true,
      studyInstanceUid: true,
      status: true,
    },
  },
  reader: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PneumoconiosisReadingInclude;

type ReadingRow = Prisma.PneumoconiosisReadingGetPayload<{ include: typeof readingInclude }>;

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}

function present(row: ReadingRow, previousProfusion: string | null = null) {
  const analysis: PneumoconiosisAnalysis = analyzePneumoconiosis(row, previousProfusion);
  return { ...row, analysis };
}

export type PneumoconiosisReadingView = ReturnType<typeof present>;

/** Pnömokonyoz: ILO readings with derived category / result, progression vs the previous film and protocol hand-off. */
@Injectable()
export class PneumoconiosisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PneumoconiosisService.name);
  }

  async list(tenantId: string, query: ReadingQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.PneumoconiosisReadingWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.result ? { result: query.result } : {}),
      ...(query.from || query.to
        ? {
            readAt: {
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
      this.prisma.pneumoconiosisReading.findMany({
        where,
        include: readingInclude,
        orderBy: { readAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.pneumoconiosisReading.count({ where }),
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
    PneumoconiosisReadingView & {
      previous: {
        id: string;
        readAt: Date;
        filmDate: Date | null;
        profusion: string | null;
      } | null;
    }
  > {
    const row = await this.row(tenantId, id);
    const previous = await this.previousFor(tenantId, row);
    return { ...present(row, previous?.profusion ?? null), previous };
  }

  /** Profusion / result timeline of a patient, oldest first. */
  async history(tenantId: string, employeeId: string) {
    const rows = await this.prisma.pneumoconiosisReading.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      include: readingInclude,
      orderBy: { readAt: 'asc' },
    });
    return rows.map((r) => {
      const v = present(r);
      return {
        id: r.id,
        readAt: r.readAt,
        filmDate: r.filmDate,
        profusion: r.profusion,
        category: v.analysis.category,
        largeOpacity: r.largeOpacity,
        result: r.result,
        readerRole: r.readerRole,
        reader: r.reader,
        flags: v.analysis.flags,
        protocol: r.protocol,
      };
    });
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateReadingDto,
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
    await this.assertLinks(tenantId, employee.id, dto);
    this.assertValues(dto);
    const { employeeId, readAt, filmDate, result, ...fields } = dto;
    const row = await this.prisma.pneumoconiosisReading.create({
      data: {
        tenantId,
        employeeId,
        readAt: readAt ? new Date(readAt) : new Date(),
        readerId: actor.id,
        filmDate: filmDate ? new Date(filmDate) : null,
        result: result ?? analyzePneumoconiosis(dto).suggested,
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      },
      include: readingInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'PneumoconiosisReading',
      entityId: row.id,
      newValue: { employeeId, protocolId: row.protocolId, result: row.result, readAt: row.readAt },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return this.get(tenantId, row.id);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateReadingDto,
    ctx: RequestContext,
  ) {
    const before = await this.row(tenantId, id);
    await this.assertLinks(tenantId, before.employeeId, dto);
    this.assertValues({
      ...before,
      ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)),
    });
    const { readAt, filmDate, ...fields } = dto as UpdateReadingDto & { employeeId?: string };
    delete fields.employeeId;
    const row = await this.prisma.pneumoconiosisReading.update({
      where: { id },
      data: {
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
        ...(readAt !== undefined ? { readAt: new Date(readAt) } : {}),
        ...(filmDate !== undefined ? { filmDate: filmDate ? new Date(filmDate) : null } : {}),
      },
      include: readingInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'PneumoconiosisReading',
      entityId: id,
      oldValue: { result: before.result },
      newValue: { result: row.result, changedFields: Object.keys(fields) },
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
    await this.prisma.pneumoconiosisReading.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'PneumoconiosisReading',
      entityId: id,
      oldValue: { employeeId: before.employeeId },
      ...ctx,
    });
  }

  /* ------------------------------------------------------------- helpers */

  private async row(tenantId: string, id: string): Promise<ReadingRow> {
    const row = await this.prisma.pneumoconiosisReading.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: readingInclude,
    });
    if (!row)
      throw new NotFoundException({
        message: 'Pneumoconiosis reading not found',
        errorCode: 'PNEUMOCONIOSIS_NOT_FOUND',
      });
    return row;
  }

  /** Latest earlier classified reading of a different film (by film date, else read date). */
  private async previousFor(tenantId: string, row: ReadingRow) {
    const anchor = row.filmDate ?? row.readAt;
    const earlier = await this.prisma.pneumoconiosisReading.findMany({
      where: {
        tenantId,
        employeeId: row.employeeId,
        deletedAt: null,
        id: { not: row.id },
        readAt: { lt: row.readAt },
        // Unreadable films (no classification) cannot serve as a comparison baseline.
        profusion: { not: null },
      },
      select: { id: true, readAt: true, filmDate: true, profusion: true },
      orderBy: { readAt: 'desc' },
    });
    const pick = earlier.find((e) => (e.filmDate ?? e.readAt).getTime() < anchor.getTime()) ?? null;
    return pick;
  }

  private assertValues(v: {
    filmQuality?: number | null;
    profusion?: string | null;
    largeOpacity?: string | null;
    shapePrimary?: string | null;
    zones?: string[];
  }) {
    if (v.filmQuality === 4) return; // unreadable films carry no classification
    if (!v.profusion)
      throw new BadRequestException({
        message: 'Profusion is required unless the film is unreadable (quality 4)',
        errorCode: 'PROFUSION_REQUIRED',
      });
    if (v.profusion !== '0/-' && v.profusion !== '0/0' && !v.shapePrimary)
      throw new BadRequestException({
        message: 'Primary opacity shape is required when small opacities are present',
        errorCode: 'SHAPE_REQUIRED',
      });
  }

  private async assertLinks(
    tenantId: string,
    employeeId: string,
    dto: { protocolId?: string | null; radiologyRequestId?: string | null },
  ) {
    if (dto.protocolId) {
      const protocol = await this.prisma.protocol.findFirst({
        where: { id: dto.protocolId, tenantId, deletedAt: null },
        select: { employeeId: true },
      });
      if (!protocol || protocol.employeeId !== employeeId)
        throw new BadRequestException({
          message: 'Protocol does not belong to this patient',
          errorCode: 'PROTOCOL_MISMATCH',
        });
    }
    if (dto.radiologyRequestId) {
      const request = await this.prisma.radiologyRequest.findFirst({
        where: { id: dto.radiologyRequestId, tenantId, deletedAt: null },
        select: { employeeId: true },
      });
      if (!request || request.employeeId !== employeeId)
        throw new BadRequestException({
          message: 'Radiology request does not belong to this patient',
          errorCode: 'RADIOLOGY_MISMATCH',
        });
    }
  }

  /** Completes the protocol's PNEUMOCONIOSIS item. Best effort. */
  private async handOff(
    tenantId: string,
    actor: AuthenticatedUser,
    row: ReadingRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find(
        (i) => i.type === 'PNEUMOCONIOSIS' && i.status === 'PENDING',
      );
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
        'pneumoconiosis: protocol item not completed',
      );
    }
  }
}
