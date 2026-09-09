import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesRepository } from '@/modules/companies/companies.repository';
import { BranchesRepository } from './branches.repository';
import type { BranchQueryDto } from './dto/branch-query.dto';
import type { CreateBranchDto } from './dto/create-branch.dto';
import type { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branches: BranchesRepository,
    private readonly companies: CompaniesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: BranchQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.branches.findMany(tenantId, skip, take, query.companyId);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const branch = await this.branches.findById(tenantId, id);
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateBranchDto,
    ctx: RequestContext,
  ) {
    // Cross-tenant reference check: the company must belong to the same tenant.
    if (!(await this.companies.exists(tenantId, dto.companyId))) {
      throw new BadRequestException({
        message: 'Company not found in this tenant',
        errorCode: 'INVALID_COMPANY',
      });
    }
    const branch = await this.branches.create(tenantId, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Branch',
      entityId: branch.id,
      newValue: dto,
      ...ctx,
    });
    return branch;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateBranchDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    const branch = await this.branches.update(tenantId, id, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Branch',
      entityId: id,
      oldValue: { name: before.name, address: before.address, phone: before.phone },
      newValue: dto,
      ...ctx,
    });
    return branch;
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.get(tenantId, id);
    await this.branches.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Branch',
      entityId: id,
      ...ctx,
    });
  }
}
