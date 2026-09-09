import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { occupationNameKey } from './occupation-name';

const withCount = {
  _count: { select: { employees: { where: { deletedAt: null } } } },
} satisfies Prisma.OccupationInclude;
export type OccupationRecord = Prisma.OccupationGetPayload<{ include: typeof withCount }>;

@Injectable()
export class OccupationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: { search?: string; isActive?: boolean },
  ) {
    const search = filters.search?.trim();
    const where: Prisma.OccupationWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { startsWith: search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.occupation.findMany({
        where,
        include: withCount,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.occupation.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<OccupationRecord | null> {
    return this.prisma.occupation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: withCount,
    });
  }

  findDuplicate(tenantId: string, nameKey: string, code: string | null, exceptId?: string) {
    return this.prisma.occupation.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        OR: [{ nameKey }, ...(code ? [{ code }] : [])],
      },
      select: { id: true, name: true, code: true },
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.OccupationUncheckedCreateInput, 'tenantId'>,
  ): Promise<OccupationRecord> {
    return this.prisma.occupation.create({ data: { ...data, tenantId }, include: withCount });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.OccupationUncheckedUpdateInput,
  ): Promise<void> {
    await this.prisma.occupation.updateMany({ where: { id, tenantId, deletedAt: null }, data });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.occupation.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /** Existing live names/codes (lower-cased) used to skip duplicates when importing defaults. */
  async existingKeys(tenantId: string): Promise<{ names: Set<string>; codes: Set<string> }> {
    const rows = await this.prisma.occupation.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true, code: true },
    });
    return {
      names: new Set(rows.map((r) => r.name.toLocaleLowerCase('tr-TR'))),
      codes: new Set(rows.flatMap((r) => (r.code ? [r.code] : []))),
    };
  }

  createMany(tenantId: string, rows: Array<{ code: string; name: string }>) {
    return this.prisma.occupation.createMany({
      data: rows.map((row) => ({ ...row, nameKey: occupationNameKey(row.name), tenantId })),
    });
  }

  exists(tenantId: string, id: string) {
    return this.prisma.occupation
      .count({ where: { id, tenantId, deletedAt: null } })
      .then((n) => n > 0);
  }
}
