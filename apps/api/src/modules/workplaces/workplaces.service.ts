import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import { AuditService } from '@/modules/audit/audit.service';
import { CompaniesRepository } from '@/modules/companies/companies.repository';
import type { CreateWorkplaceDto } from './dto/create-workplace.dto';
import type { UpdateWorkplaceDto } from './dto/update-workplace.dto';
import type { WorkplaceQueryDto } from './dto/workplace-query.dto';
import { WorkplacesRepository } from './workplaces.repository';

@Injectable()
export class WorkplacesService {
  constructor(
    private readonly workplaces: WorkplacesRepository,
    private readonly companies: CompaniesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, query: WorkplaceQueryDto) {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.workplaces.findMany(tenantId, skip, take, query.companyId);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const workplace = await this.workplaces.findById(tenantId, id);
    if (!workplace) throw new NotFoundException('Workplace not found');
    return workplace;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateWorkplaceDto,
    ctx: RequestContext,
  ) {
    if (!(await this.companies.exists(tenantId, dto.companyId))) {
      throw new BadRequestException({
        message: 'Company not found in this tenant',
        errorCode: 'INVALID_COMPANY',
      });
    }
    const workplace = await this.workplaces.create(tenantId, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Workplace',
      entityId: workplace.id,
      newValue: dto,
      ...ctx,
    });
    return workplace;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateWorkplaceDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    const workplace = await this.workplaces.update(tenantId, id, dto);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Workplace',
      entityId: id,
      oldValue: {
        name: before.name,
        hazardClass: before.hazardClass,
        employeeCount: before.employeeCount,
      },
      newValue: dto,
      ...ctx,
    });
    return workplace;
  }

  async remove(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    await this.get(tenantId, id);
    await this.workplaces.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Workplace',
      entityId: id,
      ...ctx,
    });
  }
}
