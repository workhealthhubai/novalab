import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { EmployeesRepository } from '@/modules/employees/employees.repository';
import { AppointmentsRepository } from './appointments.repository';
import type { AppointmentQueryDto } from './dto/appointment-query.dto';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly employees: EmployeesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: AppointmentQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.appointments.findMany(tenantId, skip, take, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      employeeId: query.employeeId,
      status: query.status,
    });
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const appointment = await this.appointments.findById(tenantId, id);
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
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
    if (dto.employeeId && !(await this.employees.exists(tenantId, dto.employeeId))) {
      throw new BadRequestException({
        message: 'Employee not found in this tenant',
        errorCode: 'INVALID_EMPLOYEE',
      });
    }
    // TODO(business-logic): validate companyId/examinationId/radiologyRequestId belong to the tenant and detect overlaps.
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
}
