import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SYSTEM_ROLES, TenantStatus } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { TenantsService } from './tenants.service';
import type { TenantsRepository } from './tenants.repository';
import type { RolesService } from '@/modules/roles/roles.service';
import type { AuditService } from '@/modules/audit/audit.service';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantsRepo: jest.Mocked<TenantsRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let auditService: jest.Mocked<AuditService>;
  let prismaService: jest.Mocked<PrismaService>;

  const actor: AuthenticatedUser = {
    id: 'admin-user-id',
    tenantId: 'tenant-1',
    email: 'admin@demo.local',
    firstName: 'Admin',
    lastName: 'User',
    status: 'ACTIVE',
    companyId: null,
    companyAccessActive: false,
    roles: [SYSTEM_ROLES.TENANT_ADMIN],
    permissions: ['system.manage'] as any,
  };

  const ctx: RequestContext = {
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(() => {
    tenantsRepo = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<TenantsRepository>;

    rolesService = {
      provisionSystemRoles: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<RolesService>;

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;

    prismaService = {
      role: {
        findFirst: jest.fn(),
      },
      user: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new TenantsService(tenantsRepo, rolesService, auditService, prismaService);
  });

  describe('create', () => {
    it('creates tenant and provisions roles', async () => {
      tenantsRepo.findBySlug.mockResolvedValue(null);
      tenantsRepo.create.mockResolvedValue({
        id: 'new-tenant-id',
        name: 'New OSGB',
        slug: 'new-osgb',
        status: TenantStatus.ACTIVE,
        settings: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const res = await service.create(
        actor,
        { name: 'New OSGB', slug: 'new-osgb' },
        ctx,
      );

      expect(res.id).toBe('new-tenant-id');
      expect(rolesService.provisionSystemRoles).toHaveBeenCalledWith('new-tenant-id');
      expect(auditService.log).toHaveBeenCalled();
    });

    it('rejects duplicate slug', async () => {
      tenantsRepo.findBySlug.mockResolvedValue({ id: 'other' } as any);
      await expect(
        service.create(actor, { name: 'New OSGB', slug: 'new-osgb' }, ctx),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('prevents deleting the active tenant', async () => {
      await expect(service.delete(actor, 'tenant-1', ctx)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('soft deletes when tenant exists and is not active tenant', async () => {
      tenantsRepo.findById.mockResolvedValue({
        id: 'tenant-2',
        name: 'Other OSGB',
        slug: 'other-osgb',
      } as any);
      tenantsRepo.softDelete.mockResolvedValue({} as any);

      const res = await service.delete(actor, 'tenant-2', ctx);
      expect(res.success).toBe(true);
      expect(tenantsRepo.softDelete).toHaveBeenCalledWith('tenant-2');
      expect(auditService.log).toHaveBeenCalled();
    });

    it('throws NotFoundException if tenant does not exist', async () => {
      tenantsRepo.findById.mockResolvedValue(null);
      await expect(service.delete(actor, 'tenant-2', ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
