import { Injectable } from '@nestjs/common';
import type { Appointment, AppointmentStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface AppointmentFilters {
  from?: Date;
  to?: Date;
  employeeId?: string;
  status?: AppointmentStatus;
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: AppointmentFilters) {
    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      deletedAt: null,
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

  findById(tenantId: string, id: string) {
    return this.prisma.appointment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    });
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
