/* eslint-disable no-console */
/** Local HTTP + database regression, using isolated synthetic tenants only. */
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { ALL_PERMISSIONS, PERMISSIONS } from '@osgb/shared-types';
import { hashPassword } from '../src/modules/users/users.service';
import { resetTokenHash } from '../src/modules/users/password-recovery.service';

config({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  quiet: true,
});
const api = process.env.ACCEPTANCE_API_URL ?? 'http://localhost:3002';
const database = process.env.DATABASE_URL!;
const local = (url: string) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
assert(local(api) && local(database), 'Only local API and database hosts are allowed.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: database }) });
const tenantIds = [randomUUID(), randomUUID()];
const suffix = randomUUID();
const password = `Test-${randomUUID()}1`;
interface Payload {
  token: string;
  accessToken: string;
  refreshToken: string;
  items: Array<{ id: string }>;
  unreadCount: number;
}
let checks = 0;
async function request(path: string, token = '', method = 'GET', body?: unknown, status = 200) {
  const response = await fetch(`${api}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(
    response.status,
    status,
    `${method} ${path} returned ${response.status}, expected ${status}`,
  );
  checks++;
  const json = (await response.json()) as Payload & { data?: Payload };
  return json.data ?? json;
}
async function main() {
  try {
    for (const [i, id] of tenantIds.entries())
      await db.tenant.create({
        data: { id, name: 'Synthetic recovery acceptance', slug: `recovery-${suffix}-${i}` },
      });
    const tenantId = tenantIds[0]!;
    const permissions = await db.permission.findMany({
      where: { key: { in: [...ALL_PERMISSIONS] } },
    });
    assert.equal(permissions.length, ALL_PERMISSIONS.length);
    const role = await db.role.create({
      data: {
        tenantId,
        name: 'tenant_admin',
        rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
    });
    const readerRole = await db.role.create({
      data: {
        tenantId,
        name: 'recovery_reader',
        rolePermissions: {
          create: permissions
            .filter((p) => p.key === PERMISSIONS.EXAMINATIONS_READ)
            .map((p) => ({ permissionId: p.id })),
        },
      },
    });
    const passwordHash = await hashPassword(password);
    const createUser = (name: string, roleId: string) =>
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
    const admin = await createUser('admin', role.id);
    const secondAdmin = await createUser('admin-two', role.id);
    const user = await createUser('reader', readerRole.id);
    const foreign = await db.user.create({
      data: {
        tenantId: tenantIds[1]!,
        email: `foreign-${suffix}@example.test`,
        firstName: 'Synthetic',
        lastName: 'Foreign',
        passwordHash,
      },
    });
    const login = async (email: string, value = password) =>
      request('/auth/login', '', 'POST', {
        email,
        password: value,
        tenantSlug: `recovery-${suffix}-0`,
      });
    const adminToken = (await login(admin.email)).accessToken;
    const adminTwoToken = (await login(secondAdmin.email)).accessToken;
    const oldSession = await login(user.email);
    await request(`/users/${foreign.id}/password-link`, adminToken, 'POST', {}, 404);
    await request(`/users/${admin.id}/password-link`, oldSession.accessToken, 'POST', {}, 403);
    const help = await request(
      '/auth/password-help',
      '',
      'POST',
      { email: user.email, tenantSlug: `recovery-${suffix}-0` },
      202,
    );
    const unknown = await request(
      '/auth/password-help',
      '',
      'POST',
      { email: `missing-${suffix}@example.test`, tenantSlug: `recovery-${suffix}-0` },
      202,
    );
    assert.deepEqual(help, unknown);
    const inbox = await request('/notifications', adminToken);
    const otherInbox = await request('/notifications', adminTwoToken);
    assert.equal(inbox.items.length, 1);
    assert.equal(otherInbox.items.length, 1);
    assert(inbox.items[0] && otherInbox.items[0]);
    assert.notEqual(inbox.items[0].id, otherInbox.items[0].id);
    assert.equal((await request('/notifications', oldSession.accessToken)).items.length, 0);
    await request(`/notifications/${otherInbox.items[0].id}/read`, adminToken, 'PATCH', {}, 404);
    await request('/notifications/read-all', adminToken, 'POST', {});
    assert.equal((await request('/notifications', adminToken)).unreadCount, 0);
    assert.equal((await request('/notifications', adminTwoToken)).unreadCount, 1);
    const first = await request(`/users/${user.id}/password-link`, adminToken, 'POST', {}, 201);
    const second = await request(`/users/${user.id}/password-link`, adminToken, 'POST', {}, 201);
    const stored = await db.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: resetTokenHash(second.token) },
    });
    assert.notEqual(stored.tokenHash, second.token);
    await request(
      '/auth/reset-password',
      '',
      'POST',
      { token: first.token, password: 'New-password1234' },
      400,
    );
    const attempts = await Promise.all(
      [1, 2].map(() =>
        fetch(`${api}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: second.token, password: 'New-password1234' }),
        }),
      ),
    );
    assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 400]);
    checks += 2;
    await request('/auth/me', oldSession.accessToken, 'GET', undefined, 401);
    await request('/auth/refresh', '', 'POST', { refreshToken: oldSession.refreshToken }, 401);
    await request(
      '/auth/reset-password',
      '',
      'POST',
      { token: second.token, password: 'Other-password1234' },
      400,
    );
    const renewed = await login(user.email, 'New-password1234');
    await request('/auth/me', renewed.accessToken);
    const expired = await request(`/users/${user.id}/password-link`, adminToken, 'POST', {}, 201);
    await db.passwordResetToken.update({
      where: { tokenHash: resetTokenHash(expired.token) },
      data: { expiresAt: new Date(0) },
    });
    await request(
      '/auth/reset-password',
      '',
      'POST',
      { token: expired.token, password: 'Other-password1234' },
      400,
    );
    await request('/auth/me', renewed.accessToken);
    const events = await db.auditLog.findMany({ where: { tenantId } });
    for (const secret of [first.token, second.token, expired.token, 'New-password1234'])
      assert(!JSON.stringify(events).includes(secret), 'Audit must not include recovery secrets');
    console.log(
      JSON.stringify({
        result: 'PASS',
        httpChecks: checks,
        verified: [
          'personal inbox isolation',
          'generic recovery response',
          'permission and tenant enforcement',
          'hash-only token storage',
          'replacement and expiry',
          'concurrent single use',
          'session revocation',
          'secret-free audit',
        ],
      }),
    );
  } finally {
    await db.notification.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.refreshSession.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.userRole.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.rolePermission.deleteMany({ where: { role: { tenantId: { in: tenantIds } } } });
    await db.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await db.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Acceptance check failed');
  process.exitCode = 1;
});
