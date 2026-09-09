import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export const packageInclude = {
  items: {
    orderBy: { orderIndex: 'asc' },
    include: {
      test: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          unitPrice: true,
          vatRate: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.TestPackageInclude;

export type TestPackageRecord = Prisma.TestPackageGetPayload<{ include: typeof packageInclude }>;

@Injectable()
export class TestPackagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: { search?: string; isActive?: boolean },
  ) {
    const search = filters.search?.trim();
    const where: Prisma.TestPackageWhereInput = {
      tenantId,
      deletedAt: null,
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
      this.prisma.testPackage.findMany({
        where,
        include: packageInclude,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.testPackage.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<TestPackageRecord | null> {
    return this.prisma.testPackage.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: packageInclude,
    });
  }

  findByCode(tenantId: string, code: string, exceptId?: string) {
    return this.prisma.testPackage.findFirst({
      where: { tenantId, code, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true, name: true },
    });
  }

  countLiveTests(tenantId: string, testIds: string[]) {
    return this.prisma.testDefinition.count({
      where: { tenantId, id: { in: testIds }, deletedAt: null },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.TestPackageUncheckedCreateInput, 'tenantId' | 'items'>,
    items: Array<{ testId: string; quantity: number }>,
  ): Promise<TestPackageRecord> {
    return this.prisma.testPackage.create({
      data: {
        ...data,
        tenantId,
        items: { create: items.map((item, orderIndex) => ({ ...item, orderIndex })) },
      },
      include: packageInclude,
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.TestPackageUncheckedUpdateInput,
    items?: Array<{ testId: string; quantity: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.testPackage.updateMany({ where: { id, tenantId, deletedAt: null }, data });
      if (items) {
        await tx.testPackageItem.deleteMany({ where: { packageId: id } });
        await tx.testPackageItem.createMany({
          data: items.map((item, orderIndex) => ({ packageId: id, ...item, orderIndex })),
        });
      }
    });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.testPackage.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
