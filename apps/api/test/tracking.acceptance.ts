/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ALL_PERMISSIONS, PERMISSIONS } from '@osgb/shared-types';
import { hashPassword } from '../src/modules/users/users.service';
config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  quiet: true,
});
const api = process.env.ACCEPTANCE_API_URL ?? 'http://localhost:3002';
const database = process.env.DATABASE_URL!;
const local = (s: string) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(s).hostname);
assert(local(api) && local(database), 'Only local test targets are allowed.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const tenants = [randomUUID(), randomUUID()];
const suffix = randomUUID();
interface Payload {
  id: string;
  accessToken: string;
  expiresAt: string | null;
  items: Array<{ id: string; reasons?: string[] }>;
  meta: { total: number };
}
let checks = 0;
async function request(
  path: string,
  token: string,
  method = 'GET',
  data?: unknown,
  expected = 200,
): Promise<Payload> {
  const res = await fetch(`${api}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  assert.equal(
    res.status,
    expected,
    `${method} ${path}: received ${res.status}, expected ${expected}`,
  );
  checks++;
  const body = (await res.json()) as Payload & { data?: Payload | Payload['items'] };
  return Array.isArray(body.data) ? { ...body, items: body.data } : (body.data ?? body);
}
async function main() {
  try {
    for (const [i, id] of tenants.entries())
      await db.tenant.create({
        data: { id, slug: `tracking-${suffix}-${i}`, name: 'Synthetic tracking test' },
      });
    const tenantId = tenants[0]!;
    const permissions = await db.permission.findMany({
      where: { key: { in: [...ALL_PERMISSIONS] } },
    });
    assert.equal(permissions.length, ALL_PERMISSIONS.length, 'Seed permissions first.');
    const role = await db.role.create({
      data: {
        tenantId,
        name: 'tenant_admin',
        rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
    });
    const clerkRole = await db.role.create({
      data: {
        tenantId,
        name: 'clerk',
        rolePermissions: {
          create: permissions
            .filter((p) =>
              (
                [
                  PERMISSIONS.EMPLOYEES_READ,
                  PERMISSIONS.PROTOCOLS_READ,
                  PERMISSIONS.DOCUMENTS_READ,
                  PERMISSIONS.DOCUMENTS_UPLOAD,
                ] as string[]
              ).includes(p.key),
            )
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    const password = `Test-${randomUUID()}1`;
    const passwordHash = await hashPassword(password);
    const makeUser = (name: string, roleId: string) =>
      db.user.create({
        data: {
          tenantId,
          email: `${name}-${suffix}@example.test`,
          firstName: 'Synthetic',
          lastName: name,
          passwordHash,
          userRoles: { create: { tenantId, roleId } },
        },
      });
    const admin = await makeUser('admin', role.id);
    const clerk = await makeUser('clerk', clerkRole.id);
    const login = (email: string) =>
      request('/auth/login', '', 'POST', { email, password, tenantSlug: `tracking-${suffix}-0` });
    const token = (await login(admin.email)).accessToken;
    const clerkToken = (await login(clerk.email)).accessToken;
    const company = await db.company.create({ data: { tenantId, name: 'Alpha' } });
    const employee = await db.employee.create({
      data: { tenantId, firstName: 'Synthetic', lastName: 'Patient', companyId: company.id },
    });
    await db.employee.create({
      data: { tenantId: tenants[1]!, firstName: 'Foreign', lastName: 'Patient' },
    });
    await db.employee.create({
      data: {
        tenantId,
        firstName: 'Synthetic',
        lastName: 'Passport',
        passportNumber: 'TEST-PASSPORT',
        birthDate: new Date('1990-01-01'),
        companyId: company.id,
      },
    });
    const physician = await db.physician.create({
      data: { tenantId, firstName: 'Test', lastName: 'Doctor', userId: admin.id },
    });
    const protocol = await db.protocol.create({
      data: {
        tenantId,
        employeeId: employee.id,
        companyId: company.id,
        openedById: admin.id,
        type: 'PERIODIC',
        protocolNumber: 'TEST-1',
        year: 2026,
        sequence: 1,
        items: {
          create: [
            { tenantId, type: 'LAB' },
            { tenantId, type: 'ECG', status: 'DONE' },
          ],
        },
      },
    });
    const exam = await db.examination.create({
      data: {
        tenantId,
        employeeId: employee.id,
        protocolId: protocol.id,
        physicianProfileId: physician.id,
        type: 'PERIODIC',
        status: 'IN_PROGRESS',
        performedAt: new Date('2026-09-12T21:30:00Z'),
      },
    });
    const today = new Date(
      `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T00:00:00Z`,
    );
    const day = (offset: number) => new Date(today.getTime() + offset * 86400000);
    const makeDoc = (expiresAt: Date | null, medical = false, owner = tenantId) =>
      db.document.create({
        data: {
          tenantId: owner,
          category: 'OTHER',
          fileName: 'Synthetic contract.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 0,
          bucket: 'test',
          objectKey: `${owner}/synthetic-${randomUUID()}`,
          expiresAt,
          isMedical: medical,
        },
      });
    const todayDoc = await makeDoc(today);
    const oldDoc = await makeDoc(day(-1));
    await makeDoc(day(30));
    await makeDoc(day(31));
    await makeDoc(null);
    const medical = await makeDoc(today, true);
    const foreign = await makeDoc(today, false, tenants[1]);
    assert.equal((await request('/documents?expiry=30', token)).meta.total, 3);
    assert.equal((await request('/documents?expiry=30', clerkToken)).meta.total, 2);
    assert.deepEqual(
      (await request('/documents?expiry=overdue', token)).items.map((d) => d.id),
      [oldDoc.id],
    );
    assert.equal((await request('/documents?expiry=undated', token)).meta.total, 1);
    await request(`/documents/${foreign.id}/expiry`, token, 'PATCH', { expiresAt: null }, 404);
    await request(`/documents/${medical.id}/expiry`, clerkToken, 'PATCH', { expiresAt: null }, 403);
    await request(
      `/documents/${todayDoc.id}/expiry`,
      token,
      'PATCH',
      { expiresAt: '2026-02-30' },
      400,
    );
    await request(`/documents/${todayDoc.id}/expiry`, token, 'PATCH', {}, 400);
    assert.equal(
      (await request(`/documents/${todayDoc.id}/expiry`, token, 'PATCH', { expiresAt: null }))
        .expiresAt,
      null,
    );
    assert.equal((await request('/documents?expiry=undated', token)).meta.total, 2);
    const query = new URLSearchParams({
      companySearch: 'Alpha',
      physicianSearch: 'Test Doctor',
      status: 'IN_PROGRESS',
      from: '2026-09-13',
      to: '2026-09-13',
    });
    assert.deepEqual(
      (await request(`/health-reports?${query.toString()}`, token)).items.map((r) => r.id),
      [exam.id],
    );
    query.set('companySearch', 'Beta');
    assert.equal((await request(`/health-reports?${query.toString()}`, token)).meta.total, 0);
    query.set('companySearch', 'Alpha');
    query.set('physicianSearch', 'Another Doctor');
    assert.equal((await request(`/health-reports?${query.toString()}`, token)).meta.total, 0);
    await request('/health-reports?from=2026-10-01&to=2026-09-01', token, 'GET', undefined, 400);
    assert.equal((await request('/work-items/pending', clerkToken)).meta.total, 1);
    assert.equal((await request('/work-items/reports', token)).meta.total, 1);
    await request('/work-items/reports', clerkToken, 'GET', undefined, 403);
    const missing = await request('/work-items/missing', clerkToken);
    assert.equal(missing.meta.total, 1);
    assert.deepEqual(missing.items[0]!.reasons, ['Kimlik numarası eksik', 'Doğum tarihi eksik']);
    await db.protocol.update({ where: { id: protocol.id }, data: { status: 'CANCELLED' } });
    assert.equal((await request('/work-items/pending', token)).meta.total, 0);
    assert.equal((await request('/work-items/reports', token)).meta.total, 0);
    console.log(
      JSON.stringify({
        result: 'PASS',
        httpChecks: checks,
        verified: [
          'expiry boundaries',
          'medical and tenant isolation',
          'combined report filters',
          'Istanbul date boundary',
          'pending and cancelled visits',
          'missing data scope',
        ],
      }),
    );
  } finally {
    const where = { tenantId: { in: tenants } };
    await db.auditLog.deleteMany({ where });
    await db.document.deleteMany({ where });
    await db.examination.deleteMany({ where });
    await db.protocolItem.deleteMany({ where });
    await db.protocol.deleteMany({ where });
    await db.employee.deleteMany({ where });
    await db.physician.deleteMany({ where });
    await db.refreshSession.deleteMany({ where });
    await db.userRole.deleteMany({ where });
    await db.rolePermission.deleteMany({ where: { role: where } });
    await db.user.deleteMany({ where });
    await db.role.deleteMany({ where });
    await db.company.deleteMany({ where });
    await db.tenant.deleteMany({ where: { id: { in: tenants } } });
    await db.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Tracking acceptance failed');
  process.exitCode = 1;
});
