import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  AuditAction,
  averageThreshold,
  normalizeThresholds,
  PTA_FREQUENCIES,
  type Thresholds,
} from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ProtocolsService } from '@/modules/protocols/protocols.service';
import {
  analyzeTest,
  type TestAnalysis,
  type ThresholdSet,
  toThresholds,
} from './audiometry-analysis';
import type {
  AudiometryQueryDto,
  CreateAudiometryDto,
  UpdateAudiometryDto,
} from './dto/audiometry.dtos';

const testInclude = {
  employee: {
    select: { id: true, firstName: true, lastName: true, nationalId: true, birthDate: true },
  },
  protocol: { select: { id: true, protocolNumber: true, type: true, status: true } },
  performedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AudiometryTestInclude;

type TestRow = Prisma.AudiometryTestGetPayload<{ include: typeof testInclude }>;

function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}

function parseThresholds(label: string, value: unknown): Thresholds {
  try {
    return normalizeThresholds(value);
  } catch (error) {
    throw new BadRequestException({
      message: `${label}: ${error instanceof Error ? error.message : 'invalid thresholds'}`,
      errorCode: 'THRESHOLDS_INVALID',
    });
  }
}

function decimal(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

/** Row → API shape: thresholds as plain maps, averages as numbers. */
function present(row: TestRow) {
  return {
    ...row,
    airRight: toThresholds(row.airRight),
    airLeft: toThresholds(row.airLeft),
    boneRight: row.boneRight === null ? null : toThresholds(row.boneRight),
    boneLeft: row.boneLeft === null ? null : toThresholds(row.boneLeft),
    ptaRight: decimal(row.ptaRight),
    ptaLeft: decimal(row.ptaLeft),
  };
}

export type AudiometryTestView = ReturnType<typeof present>;

/** Odyometri: pure-tone tests with derived grades, shifts against baseline/previous, protocol hand-off. */
@Injectable()
export class AudiometryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protocols: ProtocolsService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AudiometryService.name);
  }

  async list(tenantId: string, query: AudiometryQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const search = query.search?.trim();
    const where: Prisma.AudiometryTestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
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
      this.prisma.audiometryTest.findMany({
        where,
        include: testInclude,
        orderBy: { performedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.audiometryTest.count({ where }),
    ]);
    return paginate(rows.map(present), query.page, query.pageSize, total);
  }

  async get(
    tenantId: string,
    id: string,
  ): Promise<AudiometryTestView & { analysis: TestAnalysis }> {
    const row = await this.prisma.audiometryTest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: testInclude,
    });
    if (!row)
      throw new NotFoundException({
        message: 'Audiometry test not found',
        errorCode: 'AUDIOMETRY_NOT_FOUND',
      });
    const view = present(row);
    const others = await this.prisma.audiometryTest.findMany({
      where: {
        tenantId,
        employeeId: row.employeeId,
        deletedAt: null,
        id: { not: row.id },
        performedAt: { lte: row.performedAt },
      },
      select: { id: true, performedAt: true, isBaseline: true, airRight: true, airLeft: true },
      orderBy: { performedAt: 'asc' },
    });
    const sets: Array<ThresholdSet & { isBaseline: boolean }> = others.map((o) => ({
      id: o.id,
      performedAt: o.performedAt,
      isBaseline: o.isBaseline,
      airRight: toThresholds(o.airRight),
      airLeft: toThresholds(o.airLeft),
    }));
    // Baseline: the latest test flagged as baseline before this one, else the earliest test.
    const baseline = row.isBaseline
      ? null
      : ([...sets].reverse().find((s) => s.isBaseline) ?? sets[0] ?? null);
    const previous = sets.at(-1) ?? null;
    const current: ThresholdSet = {
      id: row.id,
      performedAt: row.performedAt,
      airRight: view.airRight,
      airLeft: view.airLeft,
    };
    return {
      ...view,
      analysis: analyzeTest(
        current,
        baseline,
        previous && previous.id !== baseline?.id ? previous : previous,
      ),
    };
  }

  /** PTA trend of a patient, oldest first (for the history chart). */
  async history(tenantId: string, employeeId: string) {
    const rows = await this.prisma.audiometryTest.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      select: {
        id: true,
        performedAt: true,
        isBaseline: true,
        ptaRight: true,
        ptaLeft: true,
        protocol: { select: { id: true, protocolNumber: true } },
      },
      orderBy: { performedAt: 'asc' },
    });
    return rows.map((r) => ({ ...r, ptaRight: decimal(r.ptaRight), ptaLeft: decimal(r.ptaLeft) }));
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateAudiometryDto,
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
    const data = this.thresholdData(dto);
    const row = await this.prisma.audiometryTest.create({
      data: {
        tenantId,
        employeeId: employee.id,
        protocolId: dto.protocolId ?? null,
        performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
        performedById: actor.id,
        deviceName: dto.deviceName ?? null,
        isBaseline: dto.isBaseline ?? false,
        quietHours: dto.quietHours ?? null,
        notes: dto.notes ?? null,
        ...data,
      },
      include: testInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'AudiometryTest',
      entityId: row.id,
      newValue: {
        employeeId: employee.id,
        protocolId: row.protocolId,
        isBaseline: row.isBaseline,
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
    dto: UpdateAudiometryDto,
    ctx: RequestContext,
  ) {
    const before = await this.prisma.audiometryTest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: testInclude,
    });
    if (!before)
      throw new NotFoundException({
        message: 'Audiometry test not found',
        errorCode: 'AUDIOMETRY_NOT_FOUND',
      });
    if (dto.protocolId) await this.assertProtocol(tenantId, dto.protocolId, before.employeeId);
    const merged = {
      airRight: dto.airRight ?? toThresholds(before.airRight),
      airLeft: dto.airLeft ?? toThresholds(before.airLeft),
      boneRight:
        dto.boneRight === undefined
          ? before.boneRight === null
            ? null
            : toThresholds(before.boneRight)
          : dto.boneRight,
      boneLeft:
        dto.boneLeft === undefined
          ? before.boneLeft === null
            ? null
            : toThresholds(before.boneLeft)
          : dto.boneLeft,
    };
    const data = this.thresholdData(merged);
    const row = await this.prisma.audiometryTest.update({
      where: { id },
      data: {
        ...(dto.protocolId !== undefined ? { protocolId: dto.protocolId } : {}),
        ...(dto.performedAt !== undefined ? { performedAt: new Date(dto.performedAt) } : {}),
        ...(dto.deviceName !== undefined ? { deviceName: dto.deviceName } : {}),
        ...(dto.isBaseline !== undefined ? { isBaseline: dto.isBaseline } : {}),
        ...(dto.quietHours !== undefined ? { quietHours: dto.quietHours } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...data,
      },
      include: testInclude,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'AudiometryTest',
      entityId: id,
      newValue: { changedFields: Object.keys(dto) },
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
    const before = await this.prisma.audiometryTest.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, employeeId: true },
    });
    if (!before)
      throw new NotFoundException({
        message: 'Audiometry test not found',
        errorCode: 'AUDIOMETRY_NOT_FOUND',
      });
    await this.prisma.audiometryTest.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'AudiometryTest',
      entityId: id,
      oldValue: { employeeId: before.employeeId },
      ...ctx,
    });
  }

  /* ------------------------------------------------------------- helpers */

  private thresholdData(input: {
    airRight: unknown;
    airLeft: unknown;
    boneRight?: unknown;
    boneLeft?: unknown;
  }) {
    const airRight = parseThresholds('Sağ hava yolu', input.airRight);
    const airLeft = parseThresholds('Sol hava yolu', input.airLeft);
    const boneRight =
      input.boneRight === null || input.boneRight === undefined
        ? null
        : parseThresholds('Sağ kemik yolu', input.boneRight);
    const boneLeft =
      input.boneLeft === null || input.boneLeft === undefined
        ? null
        : parseThresholds('Sol kemik yolu', input.boneLeft);
    if (
      Object.values(airRight).every((v) => v === null) &&
      Object.values(airLeft).every((v) => v === null)
    )
      throw new BadRequestException({
        message: 'At least one air-conduction threshold is required',
        errorCode: 'THRESHOLDS_EMPTY',
      });
    return {
      airRight: airRight as Prisma.InputJsonValue,
      airLeft: airLeft as Prisma.InputJsonValue,
      boneRight: boneRight === null ? Prisma.JsonNull : (boneRight as Prisma.InputJsonValue),
      boneLeft: boneLeft === null ? Prisma.JsonNull : (boneLeft as Prisma.InputJsonValue),
      ptaRight: averageThreshold(airRight, PTA_FREQUENCIES),
      ptaLeft: averageThreshold(airLeft, PTA_FREQUENCIES),
    };
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

  /**
   * After a save: mark the protocol's AUDIOMETRY item done and mirror the averages into the
   * protocol's examination (HEARING_RIGHT/LEFT) so Muayene Karşılaştırma sees them. Best effort —
   * a closed protocol or an approved examination must not block the test itself.
   */
  private async handOff(
    tenantId: string,
    actor: AuthenticatedUser,
    row: TestRow,
    ctx: RequestContext,
  ) {
    if (!row.protocolId) return;
    try {
      const protocol = await this.protocols.get(tenantId, row.protocolId);
      const item = protocol.items.find((i) => i.type === 'AUDIOMETRY' && i.status === 'PENDING');
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
        'audiometry: protocol item not completed',
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
      const now = new Date();
      const values: Array<[string, number | null]> = [
        ['HEARING_RIGHT', decimal(row.ptaRight)],
        ['HEARING_LEFT', decimal(row.ptaLeft)],
      ];
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
        'audiometry: examination measurements not mirrored',
      );
    }
  }
}
