import { Injectable } from '@nestjs/common';
import type { ProtocolItemType, ProtocolStatus } from '@osgb/shared-types';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { formatProtocolNumber } from './protocol-rules';

export interface ProtocolFilters {
  search?: string;
  status?: ProtocolStatus;
  employeeId?: string;
  companyId?: string;
  from?: Date;
  to?: Date;
}

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  nationalId: true,
  registrationNumber: true,
  birthDate: true,
  phone: true,
} satisfies Prisma.EmployeeSelect;

const userSelect = { id: true, firstName: true, lastName: true } satisfies Prisma.UserSelect;

/** The protocol's health report (examination), if opened: enough for a decision badge and a link. */
const examinationSummary = {
  where: { deletedAt: null },
  select: {
    id: true,
    status: true,
    fitnessDecision: true,
    reportDocumentId: true,
    approvedAt: true,
  },
  orderBy: { createdAt: 'desc' },
  take: 1,
} satisfies Prisma.Protocol$examinationsArgs;

export const protocolDetailInclude = {
  employee: { select: employeeSelect },
  company: { select: { id: true, name: true } },
  openedBy: { select: userSelect },
  closedBy: { select: userSelect },
  items: { orderBy: { orderIndex: 'asc' } },
  examinations: examinationSummary,
} satisfies Prisma.ProtocolInclude;

export const protocolListInclude = {
  employee: { select: employeeSelect },
  company: { select: { id: true, name: true } },
  items: { select: { id: true, type: true, status: true }, orderBy: { orderIndex: 'asc' } },
  examinations: examinationSummary,
} satisfies Prisma.ProtocolInclude;

export type ProtocolDetail = Prisma.ProtocolGetPayload<{ include: typeof protocolDetailInclude }>;
export type ProtocolListItem = Prisma.ProtocolGetPayload<{ include: typeof protocolListInclude }>;

@Injectable()
export class ProtocolsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: ProtocolFilters) {
    const search = filters.search?.trim();
    const where: Prisma.ProtocolWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.from || filters.to
        ? {
            openedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { protocolNumber: { contains: search } },
              { employee: { nationalId: { startsWith: search } } },
              { employee: { registrationNumber: { startsWith: search, mode: 'insensitive' } } },
              { employee: { firstName: { contains: search, mode: 'insensitive' } } },
              { employee: { lastName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.protocol.findMany({
        where,
        include: protocolListInclude,
        orderBy: { openedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.protocol.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<ProtocolDetail | null> {
    return this.prisma.protocol.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: protocolDetailInclude,
    });
  }

  /** Creates the protocol with its items, taking the next number from the tenant's yearly counter. */
  create(
    tenantId: string,
    data: {
      employeeId: string;
      companyId: string | null;
      type: Prisma.ProtocolCreateInput['type'];
      notes: string | null;
      openedById: string;
      items: ProtocolItemType[];
    },
  ): Promise<ProtocolDetail> {
    const now = new Date();
    const year = now.getFullYear();
    return this.prisma.$transaction(async (tx) => {
      // Upsert with increment is a single-row atomic update: concurrent creates queue on the row lock.
      const counter = await tx.protocolCounter.upsert({
        where: { tenantId_year: { tenantId, year } },
        create: { tenantId, year, last: 1 },
        update: { last: { increment: 1 } },
      });
      return tx.protocol.create({
        data: {
          tenantId,
          protocolNumber: formatProtocolNumber(year, counter.last),
          year,
          sequence: counter.last,
          employeeId: data.employeeId,
          companyId: data.companyId,
          type: data.type,
          notes: data.notes,
          openedById: data.openedById,
          openedAt: now,
          items: {
            create: data.items.map((type, orderIndex) => ({ tenantId, type, orderIndex })),
          },
        },
        include: protocolDetailInclude,
      });
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ProtocolUncheckedUpdateInput) {
    await this.prisma.protocol.updateMany({ where: { id, tenantId, deletedAt: null }, data });
  }

  addItems(tenantId: string, protocolId: string, types: ProtocolItemType[], startIndex: number) {
    return this.prisma.protocolItem.createMany({
      data: types.map((type, i) => ({ tenantId, protocolId, type, orderIndex: startIndex + i })),
    });
  }

  updateItem(tenantId: string, itemId: string, data: Prisma.ProtocolItemUncheckedUpdateInput) {
    return this.prisma.protocolItem.updateMany({ where: { id: itemId, tenantId }, data });
  }

  cancelPendingItems(tenantId: string, protocolId: string) {
    return this.prisma.protocolItem.updateMany({
      where: { tenantId, protocolId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  /** Open protocols of a patient (for "open a protocol" guards and the patient card). */
  findOpenForEmployee(tenantId: string, employeeId: string) {
    return this.prisma.protocol.findMany({
      where: { tenantId, employeeId, deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { id: true, protocolNumber: true, status: true },
    });
  }
}
