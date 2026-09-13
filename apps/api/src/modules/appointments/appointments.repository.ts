import { Injectable } from '@nestjs/common';
import type { Appointment, AppointmentStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type {
  AppointmentRelationContext,
  AppointmentRelationIds,
} from './appointment-relations.policy';

export interface AppointmentFilters {
  from?: Date;
  to?: Date;
  employeeId?: string;
  companyId?: string;
  status?: AppointmentStatus;
}

export function appointmentCompanyWhere(
  tenantId: string,
  companyId?: string,
): Prisma.AppointmentWhereInput {
  if (!companyId) return {};
  return {
    companyId,
    OR: [{ employeeId: null }, { employee: { companyId, tenantId, deletedAt: null } }],
  };
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: AppointmentFilters) {
    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      deletedAt: null,
      ...appointmentCompanyWhere(tenantId, filters.companyId),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            startsAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        skip,
        take,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string, scopeCompanyId?: string) {
    return this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
        ...appointmentCompanyWhere(tenantId, scopeCompanyId),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    });
  }

  async relationContext(
    tenantId: string,
    ids: AppointmentRelationIds,
  ): Promise<AppointmentRelationContext> {
    const [employee, company, examination, radiologyRequest] = await Promise.all([
      ids.employeeId
        ? this.prisma.employee.findFirst({
            where: { id: ids.employeeId, tenantId, deletedAt: null },
            select: { id: true, companyId: true },
          })
        : null,
      ids.companyId
        ? this.prisma.company.findFirst({
            where: { id: ids.companyId, tenantId, deletedAt: null },
            select: { id: true },
          })
        : null,
      ids.examinationId
        ? this.prisma.examination.findFirst({
            where: { id: ids.examinationId, tenantId, deletedAt: null },
            select: { id: true, employeeId: true },
          })
        : null,
      ids.radiologyRequestId
        ? this.prisma.radiologyRequest.findFirst({
            where: { id: ids.radiologyRequestId, tenantId, deletedAt: null },
            select: { id: true, employeeId: true, examinationId: true },
          })
        : null,
    ]);
    return { employee, company, examination, radiologyRequest };
  }

  async hasConflict(
    tenantId: string,
    input: {
      startsAt: Date;
      endsAt: Date;
      employeeId?: string | null;
      examinationId?: string | null;
      radiologyRequestId?: string | null;
      excludingId?: string;
    },
  ): Promise<boolean> {
    const relations: Prisma.AppointmentWhereInput[] = [];
    if (input.employeeId) relations.push({ employeeId: input.employeeId });
    if (input.examinationId) relations.push({ examinationId: input.examinationId });
    if (input.radiologyRequestId) relations.push({ radiologyRequestId: input.radiologyRequestId });
    if (relations.length === 0) return false;
    return (
      (await this.prisma.appointment.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          ...(input.excludingId ? { id: { not: input.excludingId } } : {}),
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
          OR: relations,
        },
      })) > 0
    );
  }

  create(
    tenantId: string,
    data: Omit<Prisma.AppointmentUncheckedCreateInput, 'tenantId'>,
  ): Promise<Appointment> {
    return this.prisma.appointment.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.AppointmentUncheckedUpdateInput,
  ): Promise<Appointment> {
    await this.prisma.appointment.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.appointment.findUniqueOrThrow({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.appointment.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
