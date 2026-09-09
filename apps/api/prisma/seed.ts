/* eslint-disable no-console */
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PERMISSION_DEFINITIONS, SYSTEM_ROLES } from '@osgb/shared-types';
import { PrismaClient } from '../src/generated/prisma/client';
import { ROLE_TEMPLATES } from '../src/modules/roles/role-templates';
import { seedLocations } from './seed-locations';

loadEnv({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  quiet: true,
});

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required to seed');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

const TENANT_NAME = process.env.SEED_TENANT_NAME ?? 'Demo OSGB';
const TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? 'demo';
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@demo.local').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'Admin123!') {
    throw new Error(
      'Refusing to seed the default admin password in production. Set SEED_ADMIN_PASSWORD.',
    );
  }

  // 1. Permission catalogue (global)
  for (const def of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        category: def.category,
        description: def.description,
        isMedical: def.medical ?? false,
      },
      update: {
        category: def.category,
        description: def.description,
        isMedical: def.medical ?? false,
      },
    });
  }
  console.log(`✔ ${PERMISSION_DEFINITIONS.length} permissions`);

  // 2. Demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    create: { name: TENANT_NAME, slug: TENANT_SLUG },
    update: { name: TENANT_NAME },
  });
  console.log(`✔ tenant "${tenant.name}" (${tenant.slug})`);

  // 3. System roles with permissions
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));
  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: template.name } },
      create: {
        tenantId: tenant.id,
        name: template.name,
        description: template.description,
        isSystem: true,
      },
      update: { description: template.description, isSystem: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: template.permissions
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  console.log(`✔ ${ROLE_TEMPLATES.length} system roles`);

  // 4. Tenant admin user
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { tenantId_name: { tenantId: tenant.id, name: SYSTEM_ROLES.TENANT_ADMIN } },
  });
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      status: 'ACTIVE',
    },
    update: { passwordHash, status: 'ACTIVE' },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    create: { tenantId: tenant.id, userId: admin.id, roleId: adminRole.id },
    update: {},
  });
  console.log(`✔ admin user ${ADMIN_EMAIL}`);

  // 5. Sample customer data (idempotent by name)
  const company =
    (await prisma.company.findFirst({
      where: { tenantId: tenant.id, name: 'Örnek Sanayi A.Ş.' },
    })) ??
    (await prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'Örnek Sanayi A.Ş.',
        hazardClass: 'HAZARDOUS',
        taxNumber: '1234567890',
        address: 'Organize Sanayi Bölgesi, İstanbul',
      },
    }));
  const workplace =
    (await prisma.workplace.findFirst({ where: { tenantId: tenant.id, companyId: company.id } })) ??
    (await prisma.workplace.create({
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        name: 'Merkez Fabrika',
        hazardClass: 'HAZARDOUS',
        employeeCount: 120,
      },
    }));
  const employeeCount = await prisma.employee.count({
    where: { tenantId: tenant.id, companyId: company.id },
  });
  if (employeeCount === 0) {
    await prisma.employee.createMany({
      data: [
        {
          tenantId: tenant.id,
          companyId: company.id,
          workplaceId: workplace.id,
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          jobTitle: 'Operatör',
          department: 'Üretim',
        },
        {
          tenantId: tenant.id,
          companyId: company.id,
          workplaceId: workplace.id,
          firstName: 'Mehmet',
          lastName: 'Kaya',
          jobTitle: 'Forklift Operatörü',
          department: 'Lojistik',
        },
      ],
    });
  }
  console.log('✔ sample company, workplace and employees');

  // 6. Reference data for addresses (provinces + districts from the bundled file)
  await seedLocations(prisma, {
    neighborhoods: process.env.LOCATIONS_FETCH_NEIGHBORHOODS === 'true',
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed');
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
