import { documentExpiryWhere } from './document-expiry';
import { Injectable } from '@nestjs/common';
import type { Document, DocumentCategory, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface DocumentFilters {
  expiry?: 'overdue' | '30' | '60' | '90' | 'undated' | 'all';
  employeeId?: string;
  companyId?: string;
  category?: DocumentCategory;
  /** When false, medical documents are excluded from listings. */
  includeMedical: boolean;
}

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: DocumentFilters) {
    const where: Prisma.DocumentWhereInput = {
      tenantId,
      deletedAt: null,
      ...documentExpiryWhere(filters.expiry),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.includeMedical ? {} : { isMedical: false }),
    };
    return this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: filters.expiry
          ? [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]
          : { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.document.count({ where }),
    ]);
  }

  updateExpiry(tenantId: string, id: string, expiresAt: Date | null) {
    return this.prisma.document.updateMany({
      where: { tenantId, id, deletedAt: null },
      data: { expiresAt },
    });
  }

  findById(tenantId: string, id: string): Promise<Document | null> {
    return this.prisma.document.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.DocumentUncheckedCreateInput, 'tenantId'>,
  ): Promise<Document> {
    return this.prisma.document.create({ data: { ...data, tenantId } });
  }

  findEmployeeContext(tenantId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, companyId: true },
    });
  }

  companyExists(tenantId: string, id: string) {
    return this.prisma.company
      .count({ where: { id, tenantId, deletedAt: null } })
      .then((count) => count > 0);
  }

  findExaminationContext(tenantId: string, id: string) {
    return this.prisma.examination.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        employeeId: true,
        employee: { select: { tenantId: true, companyId: true, deletedAt: true } },
      },
    });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.document.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
