import { Injectable } from '@nestjs/common';
import type { Document, DocumentCategory, Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface DocumentFilters {
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
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.includeMedical ? {} : { isMedical: false }),
    };
    return this.prisma.$transaction([
      this.prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.document.count({ where }),
    ]);
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

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.document.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
