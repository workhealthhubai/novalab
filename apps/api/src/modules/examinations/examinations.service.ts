import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import type { CreateExaminationDto } from './dto/create-examination.dto';
import type { ExaminationQueryDto } from './dto/examination-query.dto';
import type { UpdateExaminationDto } from './dto/update-examination.dto';
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
    if (before.status === 'APPROVED') {
      throw new BadRequestException({
        message: 'Approved examinations are read-only',
        errorCode: 'EXAMINATION_LOCKED',
      });
    }
    const examination = await this.examinations.update(tenantId, id, {
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

  /** Physician sign-off. TODO(business-logic): enforce physician role / e-signature. */
  async approve(tenantId: string, actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const before = await this.get(tenantId, id);
    if (before.status !== 'COMPLETED') {
      throw new BadRequestException({
        message: 'Only completed examinations can be approved',
        errorCode: 'INVALID_STATE',
      });
    }
    if (before.fitnessDecision === 'PENDING') {
      throw new BadRequestException({
        message: 'A fitness decision is required before approval',
        errorCode: 'DECISION_REQUIRED',
      });
    }
    const examination = await this.examinations.update(tenantId, id, {
      status: 'APPROVED',
      approvedById: actor.id,
      approvedAt: new Date(),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Examination',
      entityId: id,
      oldValue: { status: before.status },
      newValue: { status: 'APPROVED', fitnessDecision: examination.fitnessDecision },
      ...ctx,
    });
    return examination;
  }
}
