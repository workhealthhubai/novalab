import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { paginate, toSkipTake } from '@/common/utils/pagination';

export const missingEmployeeWhere = (tenantId: string): Prisma.EmployeeWhereInput => ({
  tenantId,
  deletedAt: null,
  status: 'ACTIVE',
  OR: [
    {
      AND: [
        { OR: [{ nationalId: null }, { nationalId: '' }] },
        { OR: [{ passportNumber: null }, { passportNumber: '' }] },
      ],
    },
    { birthDate: null },
    { companyId: null },
  ],
});

@Injectable()
export class WorkItemsService {
  constructor(private readonly prisma: PrismaService) {}
  async pending(tenantId: string, q: PaginationQueryDto) {
    const where: Prisma.ProtocolItemWhereInput = {
      tenantId,
      status: 'PENDING',
      protocol: {
        tenantId,
        deletedAt: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        employee: { deletedAt: null },
      },
    };
    const { skip, take } = toSkipTake(q.page, q.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.protocolItem.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          type: true,
          createdAt: true,
          protocolId: true,
          protocol: {
            select: {
              protocolNumber: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.protocolItem.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        title: `${r.protocol.employee.firstName} ${r.protocol.employee.lastName}`,
        description: r.protocol.protocolNumber,
        reasons: [r.type],
        date: r.createdAt,
        target: 'protocol',
        targetId: r.protocolId,
      })),
      q.page,
      q.pageSize,
      total,
    );
  }
  async reports(tenantId: string, q: PaginationQueryDto) {
    const where: Prisma.ExaminationWhereInput = {
      tenantId,
      deletedAt: null,
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
      employee: { deletedAt: null },
      OR: [
        { protocolId: null },
        { protocol: { tenantId, deletedAt: null, status: { not: 'CANCELLED' } } },
      ],
    };
    const { skip, take } = toSkipTake(q.page, q.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.examination.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          createdAt: true,
          performedAt: true,
          physicianProfileId: true,
          fitnessDecision: true,
          employee: { select: { firstName: true, lastName: true } },
          protocol: { select: { protocolNumber: true } },
        },
      }),
      this.prisma.examination.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        title: `${r.employee.firstName} ${r.employee.lastName}`,
        description: r.protocol?.protocolNumber ?? 'Protokol eksik',
        reasons: [
          ...(!r.performedAt ? ['Muayene tarihi eksik'] : []),
          ...(!r.physicianProfileId ? ['Hekim seçilmemiş'] : []),
          ...(r.fitnessDecision === 'PENDING' ? ['Hekim kararı bekleniyor'] : []),
          'Onaylanmamış',
        ],
        date: r.createdAt,
        target: 'report',
        targetId: r.id,
      })),
      q.page,
      q.pageSize,
      total,
    );
  }
  async missing(tenantId: string, q: PaginationQueryDto) {
    const where = missingEmployeeWhere(tenantId);
    const { skip, take } = toSkipTake(q.page, q.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nationalId: true,
          passportNumber: true,
          birthDate: true,
          companyId: true,
          createdAt: true,
        },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return paginate(
      rows.map((r) => ({
        id: r.id,
        title: `${r.firstName} ${r.lastName}`,
        description: 'Çalışan bilgileri',
        reasons: [
          ...(!r.nationalId && !r.passportNumber ? ['Kimlik numarası eksik'] : []),
          ...(!r.birthDate ? ['Doğum tarihi eksik'] : []),
          ...(!r.companyId ? ['Firma atanmamış'] : []),
        ],
        date: r.createdAt,
        target: 'patient',
        targetId: r.id,
      })),
      q.page,
      q.pageSize,
      total,
    );
  }
}
