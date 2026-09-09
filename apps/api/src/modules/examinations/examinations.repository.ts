import { Injectable } from '@nestjs/common';
import type { Examination, ExaminationStatus, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

const listSelect = {
  id: true,
  tenantId: true,
  employeeId: true,
  type: true,
  status: true,
  scheduledAt: true,
  performedAt: true,
  fitnessDecision: true,
  nextExaminationDue: true,
  createdAt: true,
  updatedAt: true,
  employee: { select: { id: true, firstName: true, lastName: true, companyId: true } },
} satisfies Prisma.ExaminationSelect;

/**
 * Medical data repository. List queries deliberately exclude free-text clinical
 * fields (findings/conclusion); they are only returned by `findById`.
 */
@Injectable()
export class ExaminationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: { employeeId?: string; status?: ExaminationStatus },
  ) {
    const where: Prisma.ExaminationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.examination.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.examination.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string) {
    return this.prisma.examination.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, companyId: true } },
        physician: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        radiologyRequests: {
          where: { deletedAt: null },
          select: { id: true, modality: true, status: true, studyInstanceUid: true },
        },
      },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.ExaminationUncheckedCreateInput, 'tenantId'>,
  ): Promise<Examination> {
    return this.prisma.examination.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.ExaminationUncheckedUpdateInput,
  ): Promise<Examination> {
    await this.prisma.examination.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.examination.findUniqueOrThrow({ where: { id } });
  }
}
