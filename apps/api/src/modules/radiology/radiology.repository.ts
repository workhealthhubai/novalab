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

  findExaminationContext(tenantId: string, examinationId: string) {
    return this.prisma.examination.findFirst({
      where: { id: examinationId, tenantId, deletedAt: null },
      select: { id: true, employeeId: true },
    });
  }

  findStationConfiguration(tenantId: string) {
    return this.prisma.organizationProfile.findUnique({
      where: { tenantId },
      select: { radiologyStationAet: true },
    });
  }

  async configuredTenantIds(): Promise<string[]> {
    const rows = await this.prisma.organizationProfile.findMany({
      where: {
        radiologyStationAet: { not: null },
        tenant: { status: 'ACTIVE', deletedAt: null },
      },
      select: { tenantId: true },
    });
    return rows.map((row) => row.tenantId);
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

  /** StudyInstanceUIDs already claimed anywhere in the shared PACS. */
  async linkedStudyUids(): Promise<Set<string>> {
    const rows = await this.prisma.radiologyRequest.findMany({
      where: { studyInstanceUid: { not: null } },
      select: { studyInstanceUid: true },
    });
    return new Set(rows.flatMap((r) => (r.studyInstanceUid ? [r.studyInstanceUid] : [])));
  }

  findStudyOwner(studyInstanceUid: string) {
    return this.prisma.radiologyRequest.findUnique({
      where: { studyInstanceUid },
      select: { id: true },
    });
  }

  /** Tenant-owned deterministic identifiers for orders waiting for a PACS study. */
  unlinkedOrders(tenantId: string, limit: number) {
    return this.prisma.radiologyRequest.findMany({
      where: {
        tenantId,
        deletedAt: null,
        studyInstanceUid: null,
        status: { not: 'CANCELLED' },
      },
      select: { id: true, employeeId: true, accessionNumber: true },
      orderBy: { requestedAt: 'desc' },
      take: limit,
    });
  }

  retryableWorklists(tenantId: string, limit: number, maxAttempts: number, now: Date) {
    return this.prisma.radiologyRequest.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { not: 'CANCELLED' },
        worklistStatus: 'FAILED',
        worklistAttemptCount: { lt: maxAttempts },
        OR: [{ worklistNextAttemptAt: null }, { worklistNextAttemptAt: { lte: now } }],
      },
      select: { id: true, studyInstanceUid: true, worklistId: true, worklistAttemptCount: true },
      orderBy: [{ worklistNextAttemptAt: 'asc' }, { requestedAt: 'asc' }],
      take: limit,
    });
  }

  async operationsSummary(tenantId: string, maxAttempts: number, today: Date) {
    const outstanding = {
      tenantId,
      deletedAt: null,
      studyInstanceUid: null,
      status: { not: 'CANCELLED' as const },
    };
    const [
      awaitingStudy,
      pendingWorklists,
      publishedWorklists,
      failedWorklists,
      exhaustedWorklists,
      completedToday,
      latestSync,
    ] = await this.prisma.$transaction([
      this.prisma.radiologyRequest.count({ where: outstanding }),
      this.prisma.radiologyRequest.count({
        where: { ...outstanding, worklistStatus: 'PENDING' },
      }),
      this.prisma.radiologyRequest.count({
        where: { ...outstanding, worklistStatus: 'PUBLISHED' },
      }),
      this.prisma.radiologyRequest.count({
        where: { tenantId, deletedAt: null, worklistStatus: 'FAILED' },
      }),
      this.prisma.radiologyRequest.count({
        where: {
          tenantId,
          deletedAt: null,
          worklistStatus: 'FAILED',
          worklistAttemptCount: { gte: maxAttempts },
        },
      }),
      this.prisma.radiologyRequest.count({
        where: { tenantId, deletedAt: null, completedAt: { gte: today } },
      }),
      this.prisma.radiologyRequest.aggregate({
        where: { tenantId, deletedAt: null, worklistSyncedAt: { not: null } },
        _max: { worklistSyncedAt: true },
      }),
    ]);
    return {
      awaitingStudy,
      pendingWorklists,
      publishedWorklists,
      failedWorklists,
      exhaustedWorklists,
      completedToday,
      lastWorklistSyncAt: latestSync._max.worklistSyncedAt,
    };
  }
}
