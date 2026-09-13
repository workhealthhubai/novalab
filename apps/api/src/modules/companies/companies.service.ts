import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { companyScope } from '@/common/policies/company-scope';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesRepository } from './companies.repository';
import type { CompanyQueryDto } from './dto/company-query.dto';
import type { CreateCompanyDto } from './dto/create-company.dto';
import type { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companies: CompaniesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: CompanyQueryDto, actor?: AuthenticatedUser) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.companies.findMany(
      tenantId,
      skip,
      take,
      query.search,
      companyScope(actor),
    );
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string, actor?: AuthenticatedUser) {
    const company = await this.companies.findById(tenantId, id, companyScope(actor));
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateCompanyDto,
    ctx: RequestContext,
  ) {
    const company = await this.companies.create(tenantId, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Company',
      entityId: company.id,
      newValue: dto,
      ...ctx,
    });
    return company;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateCompanyDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    const company = await this.companies.update(tenantId, id, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Company',
      entityId: id,
      oldValue: {
        name: before.name,
        taxNumber: before.taxNumber,
        hazardClass: before.hazardClass,
        address: before.address,
      },
      newValue: dto,
      ...ctx,
    });
    return company;
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.get(tenantId, id);
    await this.companies.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Company',
      entityId: id,
      ...ctx,
    });
  }
}
