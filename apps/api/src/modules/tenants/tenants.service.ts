import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, type PaginatedResult } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma, Tenant } from '@/generated/prisma/client';
import { AuditService } from '@/modules/audit/audit.service';
import { RolesService } from '@/modules/roles/roles.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenants: TenantsRepository,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
  ) {}

  async getCurrent(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenants.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async list(page: number, pageSize: number): Promise<PaginatedResult<Tenant>> {
    const { skip, take } = toSkipTake(page, pageSize);
    const [items, total] = await this.tenants.findMany(skip, take);
    return paginate(items, page, pageSize, total);
  }

  /** Creates a tenant and provisions its default system roles. */
  async create(
    actor: AuthenticatedUser,
    dto: CreateTenantDto,
    ctx: RequestContext,
  ): Promise<Tenant> {
    const tenant = await this.tenants.create({
      name: dto.name,
      slug: dto.slug,
      settings: dto.settings as Prisma.InputJsonValue | undefined,
    });
    await this.roles.provisionSystemRoles(tenant.id);
    await this.audit.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Tenant',
      entityId: tenant.id,
      newValue: { name: tenant.name, slug: tenant.slug },
      ...ctx,
    });
    return tenant;
  }

  async updateCurrent(
    actor: AuthenticatedUser,
    dto: UpdateTenantDto,
    ctx: RequestContext,
  ): Promise<Tenant> {
    const before = await this.getCurrent(actor.tenantId);
    const updated = await this.tenants.update(actor.tenantId, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.settings !== undefined ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
    });
    await this.audit.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Tenant',
      entityId: actor.tenantId,
      oldValue: { name: before.name, status: before.status, settings: before.settings },
      newValue: dto,
      ...ctx,
    });
    return updated;
  }
}
