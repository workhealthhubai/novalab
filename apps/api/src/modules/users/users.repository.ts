import { Injectable } from '@nestjs/common';
import { Prisma, type User, type UserStatus } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

/** Shape used to build the AuthenticatedUser principal. */
export const userWithAccessInclude = {
  tenant: { select: { id: true, status: true, slug: true } },
  userRoles: {
    include: {
      role: {
        include: { rolePermissions: { include: { permission: { select: { key: true } } } } },
      },
    },
  },
} satisfies Prisma.UserInclude;

export type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userWithAccessInclude }>;

export type UserForLogin = Prisma.UserGetPayload<{
  include: { tenant: { select: { id: true; status: true; slug: true } } };
  omit: { passwordHash: false };
}>;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWithAccessById(id: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userWithAccessInclude,
    });
  }

  /** Includes passwordHash - only for credential verification. */
  findForLogin(email: string, tenantSlug?: string): Promise<UserForLogin[]> {
    return this.prisma.user.findMany({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {}),
      },
      include: { tenant: { select: { id: true, status: true, slug: true } } },
      omit: { passwordHash: false },
      take: 2,
    });
  }

  findMany(tenantId: string, skip: number, take: number, search?: string) {
    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { userRoles: { include: { role: { select: { id: true, name: true } } } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  findById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { userRoles: { include: { role: { select: { id: true, name: true } } } } },
    });
  }

  create(
    tenantId: string,
    data: {
      email: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      status?: UserStatus;
    },
    roleIds: string[],
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        tenantId,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status ?? 'ACTIVE',
        userRoles: { create: roleIds.map((roleId) => ({ tenantId, roleId })) },
      },
    });
  }

  update(tenantId: string, id: string, data: Prisma.UserUpdateInput): Promise<User> {
    // updateMany + re-read keeps the tenant filter in the WHERE clause.
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id, tenantId, deletedAt: null },
        data,
      });
      if (count === 0)
        throw new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '',
        });
      return tx.user.findUniqueOrThrow({ where: { id } });
    });
  }

  async replaceRoles(tenantId: string, userId: string, roleIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { tenantId, userId } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ tenantId, userId, roleId })),
      }),
    ]);
  }

  countRolesInTenant(tenantId: string, roleIds: string[]): Promise<number> {
    return this.prisma.role.count({ where: { tenantId, id: { in: roleIds } } });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
}
