/* eslint-disable no-console */
/** Real HTTP + PostgreSQL regression check. Creates and removes its own isolated test tenants. */
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
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
const api = process.env.ACCEPTANCE_API_URL ?? 'http://localhost:3000';
const database = process.env.DATABASE_URL!;
const local = (url: string) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
assert(
  local(api) && local(database),
  'This acceptance check only runs against local API and database hosts.',
);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const tenantIds = [randomUUID(), randomUUID()];
const suffix = randomUUID();
const password = `Test-${randomUUID()}1`;
interface Payload {
  accessToken: string;
  permissions: string[];
  companyId: string;
  items: Array<{ companyId: string }>;
  meta: { total: number };
  patients: number;
  companies: number;
  protocols: number | null;
}
let checks = 0;
async function request(path: string, token: string, status = 200, init?: RequestInit) {
  const response = await fetch(`${api}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  assert.equal(response.status, status, `${path}: expected ${status}, received ${response.status}`);
  checks++;
  if (status === 204) return {} as Payload;
  const body = (await response.json()) as { data?: Payload } & Payload;
  return Array.isArray(body.data)
    ? { ...body, items: body.data, meta: body.meta }
    : (body.data ?? body);
}
async function main() {
  try {
    for (const [index, id] of tenantIds.entries())
      await db.tenant.create({
        data: { id, name: `Scope acceptance ${index}`, slug: `scope-${suffix}-${index}` },
      });
    const tenantId = tenantIds[0]!;
    const a = await db.company.create({ data: { tenantId, name: 'Synthetic scope A' } });
    const b = await db.company.create({ data: { tenantId, name: 'Synthetic scope B' } });
    const foreign = await db.company.create({
      data: { tenantId: tenantIds[1]!, name: 'Synthetic other tenant' },
    });
    const employees = await Promise.all(
      [a, b].map((company) =>
        db.employee.create({
          data: {
            tenantId,
            companyId: company.id,
            firstName: 'Synthetic',
            lastName: company.id,
            notes: 'Private medical note',
          },
        }),
      ),
    );
    const workplaces = await Promise.all(
      [a, b].map((company) =>
        db.workplace.create({
          data: { tenantId, companyId: company.id, name: 'Synthetic workplace' },
        }),
      ),
    );
    const appointments = await Promise.all(
      [a, b].map((company, index) =>
        db.appointment.create({
          data: {
            tenantId,
            companyId: company.id,
            employeeId: employees[index]!.id,
            title: 'Private visit text',
            startsAt: new Date('2030-01-01T09:00:00Z'),
            endsAt: new Date('2030-01-01T10:00:00Z'),
          },
        }),
      ),
    );
    const permissionRows = await db.permission.findMany({
      where: { key: { in: [...ALL_PERMISSIONS] } },
    });
    assert.equal(permissionRows.length, ALL_PERMISSIONS.length, 'Seed permission catalog first.');
    const broadRole = await db.role.create({
      data: {
        tenantId,
        name: 'tenant_admin',
        rolePermissions: {
          create: permissionRows.map((permission) => ({ permissionId: permission.id })),
        },
      },
    });
    const representativeRole = await db.role.create({
      data: {
        tenantId,
        name: 'company_representative',
        rolePermissions: {
          create: permissionRows.map((permission) => ({ permissionId: permission.id })),
        },
      },
    });
    const passwordHash = await hashPassword(password);
    const createUser = (name: string, companyId: string | null, roleId: string) =>
      db.user.create({
        data: {
          tenantId,
          email: `${name}-${suffix}@example.test`,
          firstName: 'Synthetic',
          lastName: name,
          passwordHash,
          companyId,
          userRoles: { create: { tenantId, roleId } },
        },
      });
    const admin = await createUser('admin', null, broadRole.id);
    const rep = await createUser('rep', a.id, representativeRole.id);
    const unassigned = await createUser('unassigned', null, representativeRole.id);
    const login = async (email: string) =>
      (
        await request('/auth/login', '', 200, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
      ).accessToken;
    const adminToken = await login(admin.email);
    const token = await login(rep.email);
    const missingToken = await login(unassigned.email);
    const me = await request('/auth/me', token);
    assert.equal(me.companyId, a.id);
    assert(!me.permissions.includes(PERMISSIONS.EXAMINATIONS_READ));
    assert(!me.permissions.includes(PERMISSIONS.USERS_UPDATE));
    for (const path of [
      '/employees',
      '/companies',
      '/workplaces',
      '/appointments',
      '/operations/dashboard',
    ])
      await request(path, missingToken, 403);
    for (const path of [
      '/employees',
      `/employees?companyId=${a.id}`,
      '/companies',
      '/workplaces',
      '/appointments',
    ]) {
      const result = await request(path, token);
      assert.equal(result.items.length, 1, `${path} must return only one company-owned row`);
      assert.equal(result.meta.total, 1);
    }
    const ownEmployee = await request(`/employees/${employees[0]!.id}`, token);
    assert.equal(ownEmployee.companyId, a.id);
    assert(!('notes' in ownEmployee));
    await request(`/employees/${employees[1]!.id}`, token, 404);
    await request(`/employees?companyId=${b.id}`, token, 404);
    await request(`/employees?search=${b.id}`, token).then((result) =>
      assert.equal(result.meta.total, 0),
    );
    await request(`/companies/${a.id}`, token);
    await request(`/companies/${b.id}`, token, 404);
    await request(`/companies/${foreign.id}`, token, 404);
    await request(`/workplaces/${workplaces[0]!.id}`, token);
    await request(`/workplaces/${workplaces[1]!.id}`, token, 404);
    await request(`/workplaces?companyId=${b.id}`, token, 404);
    const ownAppointment = await request(`/appointments/${appointments[0]!.id}`, token);
    assert(!('title' in ownAppointment));
    await request(`/appointments/${appointments[1]!.id}`, token, 404);
    await request(`/appointments?employeeId=${employees[1]!.id}`, token).then((result) =>
      assert.equal(result.meta.total, 0),
    );
    const dashboard = await request('/operations/dashboard', token);
    assert.equal(dashboard.patients, 1);
    assert.equal(dashboard.companies, 1);
    assert.equal(dashboard.protocols, null);
    for (const path of [
      '/documents',
      '/notifications',
      '/operations/lab',
      `/employees/${employees[0]!.id}/photo`,
      '/users',
    ])
      await request(path, token, 403);
    await request(`/employees/${employees[0]!.id}/reports`, token, 403, {
      method: 'POST',
      body: '{}',
    });
    await request(`/users/${rep.id}`, adminToken, 400, {
      method: 'PATCH',
      body: JSON.stringify({ companyId: foreign.id }),
    });
    await request(`/users/${rep.id}`, adminToken, 200, {
      method: 'PATCH',
      body: JSON.stringify({ companyId: b.id }),
    });
    // The same access token must immediately see the updated scope from the database.
    await request(`/employees/${employees[0]!.id}`, token, 404);
    await request(`/employees/${employees[1]!.id}`, token);
    await db.company.update({ where: { id: b.id }, data: { deletedAt: new Date() } });
    await request('/employees', token, 403);
    const internal = await request('/employees', adminToken);
    assert.equal(internal.meta.total, 2);
    console.log(
      JSON.stringify({
        result: 'PASS',
        httpChecks: checks,
        verified: [
          'company boundary',
          'query and direct-ID bypass',
          'metadata and export denial',
          'permission clamping',
          'cross-tenant assignment rejection',
          'immediate scope changes',
          'deleted company rejection',
          'internal access preserved',
        ],
      }),
    );
  } finally {
    // Only rows belonging to the two UUIDs created above are removed; existing demo data is untouched.
    await db.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.refreshSession.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.appointment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.employee.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.workplace.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.userRole.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.rolePermission.deleteMany({ where: { role: { tenantId: { in: tenantIds } } } });
    await db.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.company.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await db.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Acceptance check failed');
  process.exitCode = 1;
});
