import { PERMISSIONS, SYSTEM_ROLES } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import type { Prisma } from '@/generated/prisma/client';

export function notificationPermission(template: string) {
  if (template === 'examination-due') return PERMISSIONS.EXAMINATIONS_READ;
  if (template === 'password-reset-request') return PERMISSIONS.USERS_UPDATE;
  return PERMISSIONS.SYSTEM_MANAGE;
}

export function notificationRecipients(tenantId: string, template: string): Prisma.UserWhereInput {
  return {
    tenantId,
    status: 'ACTIVE',
    deletedAt: null,
    companyId: null,
    tenant: { status: 'ACTIVE', deletedAt: null },
    AND: [
      { userRoles: { none: { role: { name: SYSTEM_ROLES.COMPANY_REPRESENTATIVE } } } },
      {
        userRoles: {
          some: {
            role: {
              rolePermissions: { some: { permission: { key: notificationPermission(template) } } },
            },
          },
        },
      },
    ],
  };
}

/** Delivery ownership and current permissions are both checked, including after a role downgrade. */
export function notificationInbox(actor: AuthenticatedUser): Prisma.NotificationWhereInput {
  const OR: Prisma.NotificationWhereInput[] = [];
  if (actor.permissions.includes(PERMISSIONS.EXAMINATIONS_READ))
    OR.push({ template: 'examination-due' });
  if (actor.permissions.includes(PERMISSIONS.USERS_UPDATE))
    OR.push({ template: 'password-reset-request' });
  if (actor.permissions.includes(PERMISSIONS.SYSTEM_MANAGE))
    OR.push({ template: { notIn: ['examination-due', 'password-reset-request'] } });
  return { tenantId: actor.tenantId, recipientUserId: actor.id, OR };
}
