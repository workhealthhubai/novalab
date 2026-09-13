import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { companyScope } from '@/common/policies/company-scope';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import {
  assertAppointmentRelations,
  type AppointmentRelationIds,
} from './appointment-relations.policy';
import { AppointmentsRepository } from './appointments.repository';
import type { AppointmentQueryDto } from './dto/appointment-query.dto';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { UpdateAppointmentDto } from './dto/update-appointment.dto';

function appointmentVisibleTo<
  T extends {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    companyId: string | null;
    employeeId: string | null;
  },
>(actor: AuthenticatedUser | undefined, row: T) {
  if (!companyScope(actor)) return row;
  // Free text and medical document identifiers are not part of the employer's schedule view.
  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    companyId: row.companyId,
    employeeId: row.employeeId,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: AppointmentQueryDto, actor?: AuthenticatedUser) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.appointments.findMany(tenantId, skip, take, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      employeeId: query.employeeId,
      companyId: companyScope(actor),
      status: query.status,
    });
    return paginate(
      items.map((item) => appointmentVisibleTo(actor, item)),
      query.page,
      query.pageSize,
      total,
    );
  }

  async get(tenantId: string, id: string, actor?: AuthenticatedUser) {
    const appointment = await this.appointments.findById(tenantId, id, companyScope(actor));
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async getForActor(tenantId: string, id: string, actor: AuthenticatedUser) {
    return appointmentVisibleTo(actor, await this.get(tenantId, id, actor));
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateAppointmentDto,
    ctx: RequestContext,
  ) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException({
        message: 'endsAt must be after startsAt',
        errorCode: 'INVALID_RANGE',
      });
    }
    await this.assertRelations(tenantId, dto);
    await this.assertNoConflict(tenantId, {
      startsAt,
      endsAt,
      employeeId: dto.employeeId,
      examinationId: dto.examinationId,
      radiologyRequestId: dto.radiologyRequestId,
    });
    const appointment = await this.appointments.create(tenantId, {
      ...dto,
      startsAt,
      endsAt,
      createdById: actor.id,
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Appointment',
      entityId: appointment.id,
      newValue: { title: appointment.title, startsAt, endsAt, employeeId: dto.employeeId },
      ...ctx,
    });
    return appointment;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateAppointmentDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : before.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : before.endsAt;
    if (endsAt <= startsAt) {
      throw new BadRequestException({
        message: 'endsAt must be after startsAt',
        errorCode: 'INVALID_RANGE',
      });
    }
    await this.assertRelations(tenantId, {
      employeeId: dto.employeeId ?? before.employeeId ?? undefined,
      companyId: dto.companyId ?? before.companyId ?? undefined,
      examinationId: dto.examinationId ?? before.examinationId ?? undefined,
      radiologyRequestId: dto.radiologyRequestId ?? before.radiologyRequestId ?? undefined,
    });
    await this.assertNoConflict(tenantId, {
      startsAt,
      endsAt,
      employeeId: dto.employeeId ?? before.employeeId,
      examinationId: dto.examinationId ?? before.examinationId,
      radiologyRequestId: dto.radiologyRequestId ?? before.radiologyRequestId,
      excludingId: id,
    });
    const appointment = await this.appointments.update(tenantId, id, { ...dto, startsAt, endsAt });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Appointment',
      entityId: id,
      oldValue: { status: before.status, startsAt: before.startsAt, endsAt: before.endsAt },
      newValue: { status: appointment.status, startsAt, endsAt },
      ...ctx,
    });
    return appointment;
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.get(tenantId, id);
    await this.appointments.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Appointment',
      entityId: id,
      ...ctx,
    });
  }

  private async assertRelations(tenantId: string, ids: AppointmentRelationIds): Promise<void> {
    const context = await this.appointments.relationContext(tenantId, ids);
    assertAppointmentRelations(ids, context);
  }

  private async assertNoConflict(
    tenantId: string,
    input: {
      startsAt: Date;
      endsAt: Date;
      employeeId?: string | null;
      examinationId?: string | null;
      radiologyRequestId?: string | null;
      excludingId?: string;
    },
  ): Promise<void> {
    if (await this.appointments.hasConflict(tenantId, input)) {
      throw new BadRequestException({
        message: 'Appointment overlaps an existing patient, examination or radiology appointment',
        errorCode: 'APPOINTMENT_OVERLAP',
      });
    }
  }
}
