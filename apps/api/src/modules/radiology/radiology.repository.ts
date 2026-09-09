import { Injectable } from '@nestjs/common';
import type { Prisma, RadiologyRequest, RadiologyRequestStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class RadiologyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: { employeeId?: string; status?: RadiologyRequestStatus },
  ) {
    const where: Prisma.RadiologyRequestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.radiologyRequest.findMany({
        where,
        omit: { reportText: true },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.radiologyRequest.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string) {
    return this.prisma.radiologyRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.RadiologyRequestUncheckedCreateInput, 'tenantId'>,
  ): Promise<RadiologyRequest> {
    return this.prisma.radiologyRequest.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.RadiologyRequestUncheckedUpdateInput,
  ): Promise<RadiologyRequest> {
    await this.prisma.radiologyRequest.updateMany({
      where: { id, tenantId, deletedAt: null },
      data,
    });
    return this.prisma.radiologyRequest.findUniqueOrThrow({ where: { id } });
  }
}
