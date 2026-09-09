import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { AuditService } from '@/modules/audit/audit.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { ROLE_TEMPLATES } from './role-templates';
import { RolesRepository, type RoleWithPermissions } from './roles.repository';

export interface RoleView {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function toView(role: RoleWithPermissions): RoleView {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissions: role.rolePermissions.map((rp) => rp.permission.key).sort(),
    userCount: role._count.userRoles,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string): Promise<RoleView[]> {
    return (await this.roles.findMany(tenantId)).map(toView);
  }

  async get(tenantId: string, id: string): Promise<RoleView> {
    const role = await this.roles.findById(tenantId, id);
    if (!role) throw new NotFoundException('Role not found');
    return toView(role);
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateRoleDto,
    ctx: RequestContext,
  ): Promise<RoleView> {
    const role = await this.roles.create(
      tenantId,
      { name: dto.name, description: dto.description },
      dto.permissions ?? [],
    );
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Role',
      entityId: role.id,
      newValue: dto,
      ...ctx,
    });
    return toView(role);
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateRoleDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    if (before.isSystem && dto.name && dto.name !== before.name) {
      throw new BadRequestException({
        message: 'System roles cannot be renamed',
        errorCode: 'SYSTEM_ROLE',
      });
    }
    await this.roles.update(tenantId, id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Role',
      entityId: id,
      oldValue: { name: before.name, description: before.description },
      newValue: dto,
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  async setPermissions(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: SetRolePermissionsDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    await this.roles.replacePermissions(id, dto.permissions);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'RolePermission',
      entityId: id,
      oldValue: { permissions: before.permissions },
      newValue: { permissions: dto.permissions },
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  async delete(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    ctx: RequestContext,
  ): Promise<void> {
    const role = await this.get(tenantId, id);
    if (role.isSystem)
      throw new BadRequestException({
        message: 'System roles cannot be deleted',
        errorCode: 'SYSTEM_ROLE',
      });
    if (role.userCount > 0)
      throw new BadRequestException({
        message: 'Role is still assigned to users',
        errorCode: 'ROLE_IN_USE',
      });
    await this.roles.delete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Role',
      entityId: id,
      oldValue: { name: role.name },
      ...ctx,
    });
  }

  /** Creates the default system roles for a tenant (idempotent). */
  async provisionSystemRoles(tenantId: string): Promise<void> {
    for (const template of ROLE_TEMPLATES) {
      const existing = await this.roles.findByName(tenantId, template.name);
      if (existing) {
        await this.roles.replacePermissions(existing.id, template.permissions);
      } else {
        await this.roles.create(
          tenantId,
          { name: template.name, description: template.description, isSystem: true },
          template.permissions,
        );
      }
    }
  }
}
