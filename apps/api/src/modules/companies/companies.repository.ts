import { Injectable } from '@nestjs/common';
import type { Company, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

/**
 * Tenant-scoped data access. Every query carries `tenantId` in its WHERE clause;
 * callers must never pass a tenant id that did not come from the session.
 */
@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, search?: string, scopeCompanyId?: string) {
    const where: Prisma.CompanyWhereInput = {
      tenantId,
      deletedAt: null,
      ...(scopeCompanyId ? { id: scopeCompanyId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { taxNumber: { startsWith: search } },
              { sgkRegistrationNumber: { startsWith: search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          _count: { select: { employees: { where: { deletedAt: null } }, branches: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string, scopeCompanyId?: string) {
    return this.prisma.company.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
        ...(scopeCompanyId ? { AND: { id: scopeCompanyId } } : {}),
      },
      include: {
        branches: { where: { deletedAt: null } },
        workplaces: { where: { deletedAt: null } },
      },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.CompanyUncheckedCreateInput, 'tenantId'>,
  ): Promise<Company> {
    return this.prisma.company.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.CompanyUncheckedUpdateInput,
  ): Promise<Company> {
    await this.prisma.company.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.company.findUniqueOrThrow({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.company.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  exists(tenantId: string, id: string): Promise<boolean> {
    return this.prisma.company
      .count({ where: { id, tenantId, deletedAt: null } })
      .then((c) => c > 0);
  }
}
