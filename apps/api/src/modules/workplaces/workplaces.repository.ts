import { Injectable } from '@nestjs/common';
import type { Prisma, Workplace } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class WorkplacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, companyId?: string) {
    const where: Prisma.WorkplaceWhereInput = {
      tenantId,
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.workplace.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.workplace.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string, scopeCompanyId?: string) {
    return this.prisma.workplace.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
        ...(scopeCompanyId ? { companyId: scopeCompanyId } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.WorkplaceUncheckedCreateInput, 'tenantId'>,
  ): Promise<Workplace> {
    return this.prisma.workplace.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.WorkplaceUncheckedUpdateInput,
  ): Promise<Workplace> {
    await this.prisma.workplace.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.workplace.findUniqueOrThrow({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.workplace.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
