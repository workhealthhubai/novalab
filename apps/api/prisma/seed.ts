/* eslint-disable no-console */
/**
 * Database seed.
 *
 *   pnpm db:seed                       # base data + full demo dataset (skipped if demo data exists)
 *   pnpm db:seed:reset                 # wipe Postgres, MinIO, Orthanc and Redis, then seed everything
 *   SEED_DEMO=false pnpm db:seed       # base data only (permissions, tenant, roles, admin, locations)
 *
 * Base data is idempotent. The demo dataset uses deterministic ids, so re-running after a wipe
 * always produces the same records and links. See prisma/DEMO_SEED.md for what it contains.
 */
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PERMISSION_DEFINITIONS, SYSTEM_ROLES } from '@osgb/shared-types';
import { PrismaClient } from '../src/generated/prisma/client';
import { ROLE_TEMPLATES } from '../src/modules/roles/role-templates';
import { seedLocations } from './seed-locations';
import { seedDemo } from './seed/demo';
import { createOrthanc, createStorage } from './seed/lib';
import { wipeDatabase, wipeOrthanc, wipeRedis, wipeStorage } from './seed/wipe';

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
const WIPE = process.env.SEED_WIPE === 'true' || process.argv.includes('--wipe');
const DEMO = process.env.SEED_DEMO !== 'false' && !process.argv.includes('--no-demo');

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'Admin123!') {
    throw new Error(
      'Refusing to seed the default admin password in production. Set SEED_ADMIN_PASSWORD.',
    );
  }
  if (WIPE && process.env.NODE_ENV === 'production') {
    throw new Error('SEED_WIPE is not allowed in production.');
  }

  // 0. Optional clean slate: every table, every stored object, every PACS study, the queues.
  if (WIPE) {
    const tables = await wipeDatabase(prisma);
    console.log(`✔ database wiped (${tables.length} tables truncated)`);
    await wipeStorage(createStorage());
    await wipeOrthanc(createOrthanc());
    await wipeRedis();
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

  // 5. Reference data for addresses (provinces + districts from the bundled file)
  await seedLocations(prisma, {
    neighborhoods: process.env.LOCATIONS_FETCH_NEIGHBORHOODS === 'true',
  });

  // 6. Demo dataset (all modules, interconnected). Not idempotent without a wipe → guarded.
  if (!DEMO) {
    console.log('… demo dataset skipped (SEED_DEMO=false)');
    return;
  }
  const existing = await prisma.protocol.count({ where: { tenantId: tenant.id } });
  if (existing > 0 && !WIPE) {
    console.log(
      `… demo dataset skipped: tenant already has ${existing} protocols. Run "pnpm db:seed:reset" to rebuild it from scratch.`,
    );
    return;
  }
  console.log('— demo dataset');
  await seedDemo({
    prisma,
    tenantId: tenant.id,
    tenantName: tenant.name,
    admin: {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    },
    password: ADMIN_PASSWORD,
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
