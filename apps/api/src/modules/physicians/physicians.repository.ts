import { Injectable } from '@nestjs/common';
import type { PhysicianStatus } from '@osgb/shared-types';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export const physicianInclude = {
  user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
} satisfies Prisma.PhysicianInclude;

export type PhysicianDetail = Prisma.PhysicianGetPayload<{ include: typeof physicianInclude }>;

@Injectable()
export class PhysiciansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: { search?: string; status?: PhysicianStatus },
  ) {
    const search = filters.search?.trim();
    const where: Prisma.PhysicianWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { specialty: { contains: search, mode: 'insensitive' } },
              { diplomaNumber: { startsWith: search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.physician.findMany({
        where,
        include: physicianInclude,
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.physician.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<PhysicianDetail | null> {
    return this.prisma.physician.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: physicianInclude,
    });
  }

  findSignature(tenantId: string, id: string) {
    return this.prisma.physician.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, signatureKey: true, signatureUpdatedAt: true },
    });
  }

  /** Physician already linked to this user (other than `exceptId`), if any. */
  findByUser(tenantId: string, userId: string, exceptId?: string) {
    return this.prisma.physician.findFirst({
      where: { tenantId, userId, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true, firstName: true, lastName: true },
    });
  }

  userExists(tenantId: string, userId: string) {
    return this.prisma.user
      .count({ where: { id: userId, tenantId, deletedAt: null } })
      .then((n) => n > 0);
  }

  create(
    tenantId: string,
    data: Omit<Prisma.PhysicianUncheckedCreateInput, 'tenantId'>,
  ): Promise<PhysicianDetail> {
    return this.prisma.physician.create({ data: { ...data, tenantId }, include: physicianInclude });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.PhysicianUncheckedUpdateInput,
  ): Promise<void> {
    await this.prisma.physician.updateMany({ where: { id, tenantId, deletedAt: null }, data });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    // The user link is released so the account can be attached to another physician record.
    await this.prisma.physician.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), userId: null },
    });
  }
}
