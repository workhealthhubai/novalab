import { Injectable } from '@nestjs/common';
import type { TestCategory } from '@osgb/shared-types';
import type { Prisma, TestDefinition } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface TestFilters {
  search?: string;
  category?: TestCategory;
  isActive?: boolean;
}

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: TestFilters) {
    const search = filters.search?.trim();
    const where: Prisma.TestDefinitionWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.testDefinition.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.testDefinition.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<TestDefinition | null> {
    return this.prisma.testDefinition.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  findByCode(tenantId: string, code: string, exceptId?: string) {
    return this.prisma.testDefinition.findFirst({
      where: { tenantId, code, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true, name: true },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.TestDefinitionUncheckedCreateInput, 'tenantId'>,
  ): Promise<TestDefinition> {
    return this.prisma.testDefinition.create({ data: { ...data, tenantId } });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.TestDefinitionUncheckedUpdateInput,
  ): Promise<void> {
    await this.prisma.testDefinition.updateMany({ where: { id, tenantId, deletedAt: null }, data });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.testDefinition.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
