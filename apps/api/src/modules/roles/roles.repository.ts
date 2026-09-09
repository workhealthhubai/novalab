import { Injectable } from '@nestjs/common';
import type { Prisma, Role } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export const roleWithPermissionsInclude = {
  rolePermissions: {
    include: { permission: { select: { key: true, category: true, isMedical: true } } },
  },
  _count: { select: { userRoles: true } },
} satisfies Prisma.RoleInclude;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof roleWithPermissionsInclude;
}>;

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(tenantId: string): Promise<RoleWithPermissions[]> {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: roleWithPermissionsInclude,
      orderBy: { name: 'asc' },
    });
  }

  findById(tenantId: string, id: string): Promise<RoleWithPermissions | null> {
    return this.prisma.role.findFirst({
      where: { id, tenantId },
      include: roleWithPermissionsInclude,
    });
  }

  async create(
    tenantId: string,
    data: { name: string; description?: string | null; isSystem?: boolean },
    permissionKeys: readonly string[],
  ): Promise<RoleWithPermissions> {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: [...permissionKeys] } },
    });
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        isSystem: data.isSystem ?? false,
        rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
      include: roleWithPermissionsInclude,
    });
  }

  async update(tenantId: string, id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    await this.prisma.role.updateMany({ where: { id, tenantId }, data });
    return this.prisma.role.findUniqueOrThrow({ where: { id } });
  }

  async replacePermissions(roleId: string, permissionKeys: readonly string[]): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: [...permissionKeys] } },
    });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId, permissionId: p.id })),
        skipDuplicates: true,
      }),
    ]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.role.deleteMany({ where: { id, tenantId, isSystem: false } });
  }

  findByName(tenantId: string, name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { tenantId_name: { tenantId, name } } });
  }
}
