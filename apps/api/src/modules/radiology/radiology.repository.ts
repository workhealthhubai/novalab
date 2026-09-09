import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  RadiologyModality,
  RadiologyRequest,
  RadiologyRequestStatus,
} from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

/** Bare dates cover the whole day; datetimes are used as given. */
function dayStart(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
}
function dayEnd(value: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value);
}

@Injectable()
export class RadiologyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    tenantId: string,
    skip: number,
    take: number,
    filters: {
      employeeId?: string;
      status?: RadiologyRequestStatus;
      modality?: RadiologyModality;
      search?: string;
      from?: string;
      to?: string;
    },
  ) {
    const search = filters.search?.trim();
    const where: Prisma.RadiologyRequestWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.modality ? { modality: filters.modality } : {}),
      ...(filters.from || filters.to
        ? {
            requestedAt: {
              ...(filters.from ? { gte: dayStart(filters.from) } : {}),
              ...(filters.to ? { lte: dayEnd(filters.to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { bodyPart: { contains: search, mode: 'insensitive' } },
              { employee: { firstName: { contains: search, mode: 'insensitive' } } },
              { employee: { lastName: { contains: search, mode: 'insensitive' } } },
              { employee: { nationalId: { startsWith: search } } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.radiologyRequest.findMany({
        where,
        omit: { reportText: true },
        orderBy: { requestedAt: 'desc' },
        skip,
        take,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, nationalId: true } },
        },
      }),
      this.prisma.radiologyRequest.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string) {
    return this.prisma.radiologyRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, nationalId: true } },
      },
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

  /** StudyInstanceUIDs already attached to a live request of the tenant. */
  async linkedStudyUids(tenantId: string): Promise<Set<string>> {
    const rows = await this.prisma.radiologyRequest.findMany({
      where: { tenantId, deletedAt: null, studyInstanceUid: { not: null } },
      select: { studyInstanceUid: true },
    });
    return new Set(rows.flatMap((r) => (r.studyInstanceUid ? [r.studyInstanceUid] : [])));
  }
}
