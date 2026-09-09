import { Injectable } from '@nestjs/common';
import {
  type Employee,
  type EmployeeStatus,
  type IdentityVerificationStatus,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export interface EmployeeFilters {
  companyId?: string;
  status?: EmployeeStatus;
  identityVerificationStatus?: IdentityVerificationStatus;
  search?: string;
}

export const employeeDetailInclude = {
  company: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  workplace: { select: { id: true, name: true } },
  occupation: { select: { id: true, name: true, code: true } },
  addressProvince: { select: { id: true, name: true } },
  addressDistrict: { select: { id: true, name: true } },
  addressNeighborhood: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeDetail = Prisma.EmployeeGetPayload<{ include: typeof employeeDetailInclude }>;

@Injectable()
export class EmployeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string, skip: number, take: number, filters: EmployeeFilters) {
    const search = filters.search?.trim();
    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.identityVerificationStatus
        ? { identityVerificationStatus: filters.identityVerificationStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { nationalId: { startsWith: search } },
              { registrationNumber: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search.replace(/\D/g, '') || search } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.employee.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string): Promise<EmployeeDetail | null> {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: employeeDetailInclude,
    });
  }

  create(
    tenantId: string,
    data: Omit<Prisma.EmployeeUncheckedCreateInput, 'tenantId'>,
  ): Promise<Employee> {
    return this.prisma.employee.create({ data: { ...data, tenantId } });
  }

  /** Storage key of the portrait (hidden from normal reads by the global Prisma omit). */
  async findPhotoKey(
    tenantId: string,
    id: string,
  ): Promise<{ photoKey: string | null; photoUpdatedAt: Date | null } | null> {
    return this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { photoKey: true, photoUpdatedAt: true },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<Employee> {
    await this.prisma.employee.updateMany({ where: { id, tenantId, deletedAt: null }, data });
    return this.prisma.employee.findUniqueOrThrow({ where: { id } });
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await this.prisma.employee.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  exists(tenantId: string, id: string): Promise<boolean> {
    return this.prisma.employee
      .count({ where: { id, tenantId, deletedAt: null } })
      .then((c) => c > 0);
  }
}
