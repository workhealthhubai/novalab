import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, SYSTEM_ROLES, type PaginatedResult } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { Prisma, Tenant } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { RolesService } from '@/modules/roles/roles.service';
import { hashPassword } from '@/modules/users/users.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsRepository } from './tenants.repository';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenants: TenantsRepository,
    private readonly roles: RolesService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
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

  /** Creates a tenant, provisions its default system roles, and optionally sets up the first admin user. */
  async create(
    actor: AuthenticatedUser,
    dto: CreateTenantDto,
    ctx: RequestContext,
  ): Promise<Tenant> {
    const existing = await this.tenants.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException('Bu URL/tanımlayıcı kod (slug) ile kayıtlı bir OSGB zaten mevcut.');
    }

    const tenant = await this.tenants.create({
      name: dto.name,
      slug: dto.slug,
      settings: dto.settings as Prisma.InputJsonValue | undefined,
    });
    await this.roles.provisionSystemRoles(tenant.id);

    if (dto.adminEmail && dto.adminPassword) {
      const adminRole = await this.prisma.role.findFirst({
        where: { tenantId: tenant.id, name: SYSTEM_ROLES.TENANT_ADMIN },
      });
      const passwordHash = await hashPassword(dto.adminPassword);
      await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase().trim(),
          passwordHash,
          firstName: dto.adminFirstName?.trim() || 'Admin',
          lastName: dto.adminLastName?.trim() || 'Yönetici',
          userRoles: adminRole
            ? {
                create: {
                  tenantId: tenant.id,
                  roleId: adminRole.id,
                },
              }
            : undefined,
        },
      });
    }

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
    return this.updateById(actor, actor.tenantId, dto, ctx);
  }

  async updateById(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateTenantDto,
    ctx: RequestContext,
  ): Promise<Tenant> {
    const before = await this.tenants.findById(id);
    if (!before) throw new NotFoundException('OSGB bulunamadı');

    if (dto.slug && dto.slug !== before.slug) {
      const existing = await this.tenants.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Bu URL kodu (slug) başka bir OSGB tarafından kullanılıyor.');
      }
    }

    const updated = await this.tenants.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.settings !== undefined ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
    });

    await this.audit.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Tenant',
      entityId: id,
      oldValue: { name: before.name, slug: before.slug, status: before.status },
      newValue: dto,
      ...ctx,
    });
    return updated;
  }

  async delete(
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<{ success: boolean; message: string }> {
    if (id === actor.tenantId) {
      throw new BadRequestException('Aktif olarak oturum açtığınız OSGB silinemez.');
    }
    const before = await this.tenants.findById(id);
    if (!before) throw new NotFoundException('OSGB bulunamadı');

    await this.tenants.softDelete(id);

    await this.audit.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Tenant',
      entityId: id,
      oldValue: { name: before.name, slug: before.slug },
      ...ctx,
    });
    return { success: true, message: 'OSGB başarıyla silindi' };
  }
}

