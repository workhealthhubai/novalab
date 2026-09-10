/* eslint-disable no-console */
/**
 * Demo dataset orchestrator. Everything is deterministic (stable ids) and written in dependency
 * order; `seedDemo` expects the base seed (permissions, tenant, system roles, admin) to exist.
 * A second, minimal tenant proves tenant isolation.
 */
import { SYSTEM_ROLES } from '@osgb/shared-types';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { ROLE_TEMPLATES } from '../../src/modules/roles/role-templates';
import { seedAppointments, seedAuditLog, seedDocuments, seedSessions } from './demo-activity';
import { seedConsentTemplates, seedConsents } from './demo-consents';
import { type DemoContext, hashPassword, loadLocations } from './demo-context';
import {
  seedCompanies,
  seedEmployees,
  seedOccupations,
  seedOrganization,
  seedPhysicians,
  seedStaff,
  seedTests,
} from './demo-definitions';
import { seedExaminations, seedProtocols, seedReports } from './demo-protocols';
import {
  seedAudiometry,
  seedEcg,
  seedEye,
  seedPneumoconiosis,
  seedRadiology,
  seedSpirometry,
  testSummaries,
} from './demo-tests';
import { createOrthanc, createStorage, daysAgo, dateOnly, gsm, tcKimlikNo, uid } from './lib';

export interface DemoInput {
  prisma: PrismaClient;
  tenantId: string;
  tenantName: string;
  admin: { id: string; email: string; firstName: string; lastName: string };
  password: string;
}

export async function seedDemo(input: DemoInput): Promise<void> {
  const { prisma } = input;
  const storage = createStorage();
  const orthanc = createOrthanc();
  if (storage) {
    try {
      await storage.put(`${input.tenantId}/.seed-probe`, Buffer.from('ok'), 'text/plain');
    } catch (error) {
      console.warn(
        `⚠ MinIO unreachable (${(error as Error).message}); documents, photos and signatures are skipped`,
      );
    }
  }
  const locations = await loadLocations(prisma);
  const ctx: DemoContext = {
    prisma,
    storage,
    orthanc,
    tenantId: input.tenantId,
    tenantName: input.tenantName,
    passwordHash: await hashPassword(input.password),
    users: { admin: input.admin } as DemoContext['users'],
    physicians: {} as DemoContext['physicians'],
    occupations: new Map(),
    tests: new Map(),
    ...locations,
    requestCounter: 0,
  };
  if (ctx.neighborhoods.size === 0)
    console.log(
      '… no neighbourhoods imported (LOCATIONS_FETCH_NEIGHBORHOODS=true); patient addresses stop at district level',
    );

  await prisma.tenant.update({
    where: { id: input.tenantId },
    data: {
      settings: {
        locale: 'tr-TR',
        timezone: 'Europe/Istanbul',
        protocol: { periodicReminderDays: 30 },
        reports: { defaultNextExaminationMonths: 12 },
      },
    },
  });

  await seedOrganization(ctx);
  await seedStaff(ctx);
  await seedPhysicians(ctx);
  await seedOccupations(ctx);
  await seedTests(ctx);
  await seedCompanies(ctx);
  await seedEmployees(ctx);
  await seedConsentTemplates(ctx);
  await seedConsents(ctx);
  await seedProtocols(ctx);
  await seedExaminations(ctx);
  await seedAudiometry(ctx);
  await seedEcg(ctx);
  await seedSpirometry(ctx);
  await seedEye(ctx);
  await seedRadiology(ctx);
  await seedPneumoconiosis(ctx);
  await seedReports(ctx, testSummaries);
  await seedDocuments(ctx);
  await seedAppointments(ctx);
  await seedSessions(ctx);
  await seedAuditLog(ctx);
  await seedSecondTenant(prisma, ctx.passwordHash);
}

/** "Ege OSGB": a second tenant with its own admin, one company and two patients. */
async function seedSecondTenant(prisma: PrismaClient, passwordHash: string): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'ege' },
    create: { id: uid('tenant:ege'), name: 'Ege OSGB', slug: 'ege', settings: { locale: 'tr-TR' } },
    update: {},
  });
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const byKey = new Map(permissions.map((p) => [p.key, p.id]));
  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: template.name } },
      create: {
        tenantId: tenant.id,
        name: template.name,
        description: template.description,
        isSystem: true,
      },
      update: {},
    });
    await prisma.rolePermission.createMany({
      data: template.permissions
        .map((key) => byKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_name: { tenantId: tenant.id, name: SYSTEM_ROLES.TENANT_ADMIN } },
  });
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@ege.local' } },
    create: {
      id: uid('user:admin@ege.local'),
      tenantId: tenant.id,
      email: 'admin@ege.local',
      passwordHash,
      firstName: 'Ege',
      lastName: 'Yönetici',
      status: 'ACTIVE',
      lastLoginAt: daysAgo(1, 9, 0),
    },
    update: { passwordHash },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { tenantId: tenant.id, userId: admin.id, roleId: adminRole.id },
    update: {},
  });
  await prisma.organizationProfile.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      legalName: 'Ege Ortak Sağlık Güvenlik Birimi A.Ş.',
      taxOffice: 'Bornova',
      taxNumber: '3310027765',
      authorizationNumber: 'OSGB-2022-0911',
      authorizationDate: dateOnly(2022, 6, 1),
      phone: '02324440102',
      email: 'info@ege-osgb.com.tr',
      addressLine: 'Kazımdirik Mah. 186. Sok. No:4 Bornova / İzmir',
    },
    update: {},
  });
  const company = await prisma.company.upsert({
    where: { id: uid('company:ege-tekstil') },
    create: {
      id: uid('company:ege-tekstil'),
      tenantId: tenant.id,
      name: 'Ege Tekstil San. A.Ş.',
      hazardClass: 'HAZARDOUS',
      taxNumber: '4470018223',
      address: 'Kemalpaşa OSB, İzmir',
      phone: '02328770011',
      email: 'ik@egetekstil.com',
    },
    update: {},
  });
  const workplace = await prisma.workplace.upsert({
    where: { id: uid('workplace:ege-tekstil') },
    create: {
      id: uid('workplace:ege-tekstil'),
      tenantId: tenant.id,
      companyId: company.id,
      name: 'Kemalpaşa Fabrika',
      hazardClass: 'HAZARDOUS',
      naceCode: '13.20.01',
      employeeCount: 210,
    },
    update: {},
  });
  for (const [key, first, last, gender, birth] of [
    ['ege-1', 'Cansu', 'Ergin', 'FEMALE', dateOnly(1994, 2, 11)],
    ['ege-2', 'Tolga', 'Barış', 'MALE', dateOnly(1987, 9, 23)],
  ] as const) {
    await prisma.employee.upsert({
      where: { id: uid(`employee:${key}`) },
      create: {
        id: uid(`employee:${key}`),
        tenantId: tenant.id,
        companyId: company.id,
        workplaceId: workplace.id,
        nationalId: tcKimlikNo(key),
        firstName: first,
        lastName: last,
        gender,
        birthDate: birth,
        phone: gsm(key),
        jobTitle: 'Dokuma Operatörü',
        department: 'Dokuma',
        hireDate: dateOnly(2023, 5, 2),
        identityVerificationStatus: 'VERIFIED',
        identityVerificationSource: 'nvi-kps-public',
        identityVerifiedAt: daysAgo(30),
      },
      update: {},
    });
  }
  console.log('✔ second tenant "Ege OSGB" (admin@ege.local) with 1 company, 2 employees');
}
