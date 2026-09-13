import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  AuditAction,
  PERMISSIONS,
  SYSTEM_ROLES,
  type Permission,
  type PaginatedResult,
} from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { paginate, toSkipTake } from '@/common/utils/pagination';
import type { User } from '@/generated/prisma/client';
import { AuditService } from '@/modules/audit/audit.service';
import type { AssignRolesDto } from './dto/assign-roles.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { SetPasswordDto } from './dto/set-password.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';
import { UsersRepository, type UserWithAccess } from './users.repository';

/** Argon2id parameters (OWASP baseline). */
export const ARGON2_OPTIONS: argon2.HashOptions & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  raw: false,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password).catch(() => false);
}

/** Flattens roles/permissions into the request principal. */
export function toAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
  const roles = user.userRoles.map((ur) => ur.role.name);
  const permissions = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.rolePermissions) permissions.add(rp.permission.key);
  }
  if (user.companyId || roles.includes(SYSTEM_ROLES.COMPANY_REPRESENTATIVE)) {
    const allowed = new Set<string>([
      PERMISSIONS.COMPANIES_READ,
      PERMISSIONS.EMPLOYEES_READ,
      PERMISSIONS.WORKPLACES_READ,
      PERMISSIONS.APPOINTMENTS_READ,
    ]);
    for (const permission of permissions)
      if (!allowed.has(permission)) permissions.delete(permission);
  }
  if (user.isSuperAdmin) {
    permissions.add(PERMISSIONS.TENANTS_MANAGE);
  } else {
    permissions.delete(PERMISSIONS.TENANTS_MANAGE);
  }
  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    companyId: user.companyId ?? null,
    companyAccessActive: Boolean(user.company && !user.company.deletedAt),
    roles,
    permissions: [...permissions].sort() as Permission[],
    isSuperAdmin: Boolean(user.isSuperAdmin),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async findAuthenticatedUser(
    id: string,
  ): Promise<{ user: AuthenticatedUser; tenantStatus: string } | null> {
    const user = await this.users.findWithAccessById(id);
    if (!user) return null;
    return { user: toAuthenticatedUser(user), tenantStatus: user.tenant.status };
  }

  async list(tenantId: string, query: UserQueryDto): Promise<PaginatedResult<unknown>> {
    const { skip, take } = toSkipTake(query.page, query.pageSize);
    const [items, total] = await this.users.findMany(tenantId, skip, take, query.search);
    return paginate(items, query.page, query.pageSize, total);
  }

  async get(tenantId: string, id: string) {
    const user = await this.users.findById(tenantId, id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateUserDto,
    ctx: RequestContext,
  ): Promise<User> {
    await this.assertCompany(tenantId, dto.companyId);
    const roleIds = dto.roleIds ?? [];
    await this.assertRolesBelongToTenant(tenantId, roleIds);
    const passwordHash = await hashPassword(dto.password);
    const user = await this.users.create(
      tenantId,
      {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        companyId: dto.companyId,
      },
      roleIds,
    );
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      newValue: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleIds,
        companyId: user.companyId,
      },
      ...ctx,
    });
    return user;
  }

  async update(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
    ctx: RequestContext,
  ) {
    const before = await this.get(tenantId, id);
    await this.assertCompany(tenantId, dto.companyId);
    if (id === actor.id && dto.companyId !== undefined && dto.companyId !== before.companyId) {
      throw new BadRequestException('Kendi firma erişim kapsamınızı değiştiremezsiniz.');
    }
    if (id === actor.id && dto.status !== undefined && dto.status !== 'ACTIVE') {
      throw new BadRequestException({
        message: 'You cannot deactivate your own account',
        errorCode: 'CANNOT_CHANGE_OWN_STATUS',
      });
    }
    const updated = await this.users.update(tenantId, id, {
      ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
      ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    if (dto.status !== undefined && dto.status !== 'ACTIVE') await this.users.revokeSessions(id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      oldValue: {
        email: before.email,
        firstName: before.firstName,
        lastName: before.lastName,
        status: before.status,
      },
      newValue: dto,
      ...ctx,
    });
    return updated;
  }

  /** Admin password reset: stores the new hash and signs the user out everywhere. */
  async setPassword(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: SetPasswordDto,
    ctx: RequestContext,
  ): Promise<{ revokedSessions: number }> {
    await this.get(tenantId, id);
    const passwordHash = await hashPassword(dto.password);
    await this.users.update(tenantId, id, { passwordHash });
    const revokedSessions = await this.users.revokeSessions(id);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: id,
      newValue: { passwordReset: true, revokedSessions },
      ...ctx,
    });
    return { revokedSessions };
  }

  async assignRoles(
    tenantId: string,
    actor: AuthenticatedUser,
    id: string,
    dto: AssignRolesDto,
    ctx: RequestContext,
  ) {
    await this.get(tenantId, id);
    await this.assertRolesBelongToTenant(tenantId, dto.roleIds);
    await this.users.replaceRoles(tenantId, id, dto.roleIds);
    await this.audit.log({
      tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'UserRole',
      entityId: id,
      newValue: { roleIds: dto.roleIds },
      ...ctx,
    });
    return this.get(tenantId, id);
  }

  touchLastLogin(id: string): Promise<void> {
    return this.users.touchLastLogin(id);
  }

  private async assertCompany(tenantId: string, companyId: string | null | undefined) {
    if (companyId && !(await this.users.companyExists(tenantId, companyId))) {
      throw new BadRequestException({
        message: 'Seçilen firma bu kurumda bulunamadı.',
        errorCode: 'INVALID_COMPANY',
      });
    }
  }

  private async assertRolesBelongToTenant(tenantId: string, roleIds: string[]): Promise<void> {
    if (roleIds.length === 0) return;
    const count = await this.users.countRolesInTenant(tenantId, roleIds);
    if (count !== roleIds.length) {
      throw new BadRequestException({
        message: 'One or more roles do not exist in this tenant',
        errorCode: 'INVALID_ROLE',
      });
    }
  }
}
