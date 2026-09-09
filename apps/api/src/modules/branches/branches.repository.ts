import { Injectable } from '@nestjs/common';
import type { Branch, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, companyId?: string) {
    const where: Prisma.BranchWhereInput = {
      tenantId,
      deletedAt: null,
      ...(companyId ? { companyId } : {}),
    };
    return this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.branch.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string) {
    return this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.BranchUncheckedCreateInput, 'tenantId'>,
  ): Promise<Branch> {
    return this.prisma.branch.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.BranchUncheckedUpdateInput,
  ): Promise<Branch> {
    await this.prisma.branch.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.branch.findUniqueOrThrow({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.branch.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
