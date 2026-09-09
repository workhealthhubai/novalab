import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { analyzeEye, AuditAction, type EyeAnalysis } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import type { CreateEyeDto, EyeQueryDto, UpdateEyeDto } from './dto/eye.dtos';

const examInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, nationalId: true, birthDate: true },
  },
  protocol: { select: { id: true, protocolNumber: true, type: true, status: true } },
  performedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.EyeExaminationInclude;

type ExamRow = Prisma.EyeExaminationGetPayload<{ include: typeof examInclude }>;
const DECIMAL_FIELDS = ['farRight', 'farLeft', 'farRightCorrected', 'farLeftCorrected'] as const;

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}
function num(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

function present(row: ExamRow) {
  const numbers = Object.fromEntries(DECIMAL_FIELDS.map((f) => [f, num(row[f])])) as Record<
    (typeof DECIMAL_FIELDS)[number],
    number | null
  >;
  const analysis: EyeAnalysis = analyzeEye({ ...row, ...numbers });
  return { ...row, ...numbers, analysis };
}

export type EyeExaminationView = ReturnType<typeof present>;

/** Göz: visual acuity, colour vision and visual field records with derived flags and protocol hand-off. */
@Injectable()
export class EyeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EyeService.name);
  }

  async list(tenantId: string, query: EyeQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.EyeExaminationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.recommendation ? { recommendation: query.recommendation } : {}),
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
      this.prisma.eyeExamination.findMany({
        where,
        include: examInclude,
        orderBy: { performedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.eyeExamination.count({ where }),
    ]);
    return paginate(rows.map(present), query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string): Promise<EyeExaminationView> {
    return present(await this.row(tenantId, id));
  }

  async history(tenantId: string, employeeId: string) {
    const rows = await this.prisma.eyeExamination.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      include: examInclude,
      orderBy: { performedAt: 'asc' },
    });
    return rows.map((r) => {
      const v = present(r);
      return {
        id: r.id,
        performedAt: r.performedAt,
        bestRight: v.analysis.bestRight,
        bestLeft: v.analysis.bestLeft,
        colorVision: v.analysis.colorVision,
        recommendation: r.recommendation,
        flags: v.analysis.flags,
        protocol: r.protocol,
      };
    });
  }

  async create(tenantId: string, actor: AuthenticatedUser, dto: CreateEyeDto, ctx: RequestContext) {
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
    const { employeeId, performedAt, recommendation, ...fields } = dto;
    const row = await this.prisma.eyeExamination.create({
      data: {
        tenantId,
        employeeId,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        performedById: actor.id,
        recommendation: recommendation ?? analyzeEye(dto).suggested,
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
      },
      include: examInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'EyeExamination',
      entityId: row.id,
      newValue: {
        employeeId,
        protocolId: row.protocolId,
        recommendation: row.recommendation,
        performedAt: row.performedAt,
      },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return present(row);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateEyeDto,
    ctx: RequestContext,
  ) {
    const before = await this.row(tenantId, id);
    if (dto.protocolId) await this.assertProtocol(tenantId, dto.protocolId, before.employeeId);
    const merged = {
      ...present(before),
      ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)),
    };
    this.assertValues(merged);
    const { performedAt, ...fields } = dto as UpdateEyeDto & { employeeId?: string };
    delete fields.employeeId;
    const row = await this.prisma.eyeExamination.update({
      where: { id },
      data: {
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
        ...(performedAt !== undefined ? { performedAt: new Date(performedAt) } : {}),
      },
      include: examInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'EyeExamination',
      entityId: id,
      oldValue: { recommendation: before.recommendation },
      newValue: { recommendation: row.recommendation, changedFields: Object.keys(fields) },
      ...ctx,
    });
    await this.handOff(tenantId, actor, row, ctx);
    return present(row);
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const before = await this.row(tenantId, id);
    await this.prisma.eyeExamination.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'EyeExamination',
      entityId: id,
      oldValue: { employeeId: before.employeeId },
      ...ctx,
    });
  }

  /* ------------------------------------------------------------- helpers */

  private async row(tenantId: string, id: string): Promise<ExamRow> {
    const row = await this.prisma.eyeExamination.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: examInclude,
    });
    if (!row)
      throw new NotFoundException({
        message: 'Eye examination not found',
        errorCode: 'EYE_NOT_FOUND',
      });
    return row;
  }

  private assertValues(v: {
    farRight?: number | null;
    farLeft?: number | null;
    ishiharaCorrect?: number | null;
    ishiharaTotal?: number | null;
  }) {
    if (!v.farRight && !v.farLeft)
      throw new BadRequestException({
        message: 'Distance acuity of at least one eye is required',
        errorCode: 'EYE_EMPTY',
      });
    if (
      v.ishiharaCorrect !== null &&
      v.ishiharaCorrect !== undefined &&
      (!v.ishiharaTotal || v.ishiharaCorrect > v.ishiharaTotal)
    )
      throw new BadRequestException({
        message: 'Ishihara plates read cannot exceed plates shown',
        errorCode: 'EYE_INVALID',
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

  /** Completes the protocol's EYE item and mirrors best acuity into VISION_RIGHT/LEFT. Best effort. */
  private async handOff(
    tenantId: string,
    actor: AuthenticatedUser,
    row: ExamRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find((i) => i.type === 'EYE' && i.status === 'PENDING');
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
        'eye: protocol item not completed',
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
      const now = new Date();
      for (const [key, value] of [
        ['VISION_RIGHT', analysis.bestRight],
        ['VISION_LEFT', analysis.bestLeft],
      ] as Array<[string, number | null]>) {
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
        'eye: measurements not mirrored',
      );
    }
  }
}
