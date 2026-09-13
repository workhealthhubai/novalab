import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, measurementDefinition } from '@osgb/shared-types';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { examinationDate, presentKeys, toMeasurementMap } from './examination-comparison';
import type { CompareQueryDto, SetMeasurementsDto } from './dto/measurement.dtos';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import type { CreateExaminationDto } from './dto/create-examination.dto';
import type { ExaminationQueryDto } from './dto/examination-query.dto';
import type { UpdateExaminationDto } from './dto/update-examination.dto';
import {
  assertExaminationUpdateTransition,
  throwExaminationVersionConflict,
} from './examination-status.policy';
import { ExaminationsRepository } from './examinations.repository';

function toDate(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

@Injectable()
export class ExaminationsService {
  constructor(
    private readonly examinations: ExaminationsRepository,
    private readonly employees: EmployeesRepository,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async list(tenantId: string, query: ExaminationQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.examinations.findMany(tenantId, skip, take, query);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const examination = await this.examinations.findById(tenantId, id);
    if (!examination) throw new NotFoundException('Examination not found');
    return examination;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateExaminationDto,
    ctx: RequestContext,
  ) {
    if (!(await this.employees.exists(tenantId, dto.employeeId))) {
      throw new BadRequestException({
        message: 'Employee not found in this tenant',
        errorCode: 'INVALID_EMPLOYEE',
      });
    }
    await this.assertPhysician(tenantId, dto.physicianId);
    const examination = await this.examinations.create(tenantId, {
      ...dto,
      scheduledAt: toDate(dto.scheduledAt),
    });
    // Audit metadata only - clinical free text is never copied into the audit trail.
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Examination',
      entityId: examination.id,
      newValue: {
        employeeId: examination.employeeId,
        type: examination.type,
        scheduledAt: examination.scheduledAt,
      },
      ...ctx,
    });
    return examination;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateExaminationDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    assertExaminationUpdateTransition(before.status, dto.status ?? before.status);
    await this.assertPhysician(tenantId, dto.physicianId);
    const examination = await this.examinations.update(tenantId, id, before.version, {
      ...dto,
      scheduledAt: toDate(dto.scheduledAt),
      performedAt: toDate(dto.performedAt),
      nextExaminationDue: toDate(dto.nextExaminationDue),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Examination',
      entityId: id,
      oldValue: { status: before.status, fitnessDecision: before.fitnessDecision },
      newValue: {
        status: examination.status,
        fitnessDecision: examination.fitnessDecision,
        changedFields: Object.keys(dto),
      },
      ...ctx,
    });
    return examination;
  }

  /** All examinations of a patient, newest first, with the measurement count (no clinical text). */
  async timeline(tenantId: string, employeeId: string) {
    const rows = await this.prisma.examination.findMany({
      where: { tenantId, employeeId, deletedAt: null },
      select: {
        id: true,
        type: true,
        status: true,
        scheduledAt: true,
        performedAt: true,
        createdAt: true,
        fitnessDecision: true,
        nextExaminationDue: true,
        protocol: { select: { id: true, protocolNumber: true } },
        physician: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { measurements: true } },
      },
    });
    return rows
      .map((row) => ({ ...row, date: examinationDate(row) }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /** Side-by-side data for Muayene Karşılaştırma: selected (or latest three) examinations, oldest first. */
  async compare(tenantId: string, query: CompareQueryDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: query.employeeId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, nationalId: true, birthDate: true },
    });
    if (!employee)
      throw new NotFoundException({
        message: 'Employee not found',
        errorCode: 'EMPLOYEE_NOT_FOUND',
      });
    const rows = await this.prisma.examination.findMany({
      where: {
        tenantId,
        employeeId: employee.id,
        deletedAt: null,
        ...(query.ids ? { id: { in: query.ids } } : {}),
      },
      include: {
        protocol: {
          select: {
            id: true,
            protocolNumber: true,
            items: { select: { type: true, status: true }, orderBy: { orderIndex: 'asc' } },
          },
        },
        physician: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        measurements: { select: { key: true, value: true, note: true, recordedAt: true } },
      },
    });
    if (query.ids && rows.length !== query.ids.length)
      throw new NotFoundException({
        message: 'One or more examinations were not found for this patient',
        errorCode: 'EXAMINATION_NOT_FOUND',
      });
    const sorted = rows
      .map((row) => ({ ...row, date: examinationDate(row) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const selected = query.ids ? sorted : sorted.slice(-3);
    const examinations = selected.map(({ measurements, ...row }) => ({
      ...row,
      measurements: toMeasurementMap(measurements),
    }));
    return { employee, examinations, keys: presentKeys(examinations.map((e) => e.measurements)) };
  }

  /** Replaces the structured measurements of an examination (approved ones are read-only). */
  async setMeasurements(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: SetMeasurementsDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    if (before.status === 'APPROVED')
      throw new BadRequestException({
        message: 'Approved examinations are read-only',
        errorCode: 'EXAMINATION_LOCKED',
      });
    const seen = new Set<string>();
    for (const m of dto.measurements) {
      const def = measurementDefinition(m.key);
      if (!def || def.derived || seen.has(m.key) || m.value < def.min || m.value > def.max)
        throw new BadRequestException({
          message: `Invalid measurement: ${m.key}`,
          errorCode: 'MEASUREMENT_INVALID',
        });
      seen.add(m.key);
    }
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.examination.updateMany({
        where: {
          id,
          tenantId,
          deletedAt: null,
          status: { not: 'APPROVED' },
          version: before.version,
        },
        data: { version: { increment: 1 } },
      });
      if (count !== 1) throwExaminationVersionConflict();
      await tx.examinationMeasurement.deleteMany({
        where: { tenantId, examinationId: id, key: { notIn: [...seen] } },
      });
      await Promise.all(
        dto.measurements.map((m) =>
          tx.examinationMeasurement.upsert({
            where: { examinationId_key: { examinationId: id, key: m.key } },
            create: {
              tenantId,
              examinationId: id,
              key: m.key,
              value: m.value,
              note: m.note ?? null,
              recordedAt: now,
              recordedById: actor.id,
            },
            update: {
              value: m.value,
              note: m.note ?? null,
              recordedAt: now,
              recordedById: actor.id,
            },
          }),
        ),
      );
    });
    // Keys only: the values themselves are medical data and stay out of the audit trail.
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Examination',
      entityId: id,
      newValue: { measurementKeys: [...seen] },
      ...ctx,
    });
    const rows = await this.prisma.examinationMeasurement.findMany({
      where: { examinationId: id },
      select: { key: true, value: true, note: true, recordedAt: true },
    });
    return { examinationId: id, measurements: toMeasurementMap(rows) };
  }

  private async assertPhysician(tenantId: string, physicianId: string | undefined): Promise<void> {
    if (!physicianId) return;
    if (!(await this.examinations.physicianUserExists(tenantId, physicianId))) {
      throw new BadRequestException({
        message: 'Physician user not found or inactive in this tenant',
        errorCode: 'INVALID_PHYSICIAN',
      });
    }
  }
}
