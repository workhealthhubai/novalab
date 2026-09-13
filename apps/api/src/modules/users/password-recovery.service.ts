import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@osgb/shared-types';
import type { AuthenticatedUser, RequestContext } from '@/common/interfaces';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { notificationRecipients } from '@/modules/notifications/notification-audience';
import { hashPassword } from './users.service';
import type { PasswordHelpDto, ResetPasswordDto } from './dto/password-recovery.dto';

export const PASSWORD_HELP_MESSAGE =
  'Bilgiler bir aktif hesapla eşleşiyorsa kurum yöneticisine talebiniz iletildi. Kurtarma bağlantısını kurum yöneticinizden alın.';
export const resetTokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
const invalid = () =>
  new BadRequestException({
    message:
      'Bağlantı geçersiz, kullanılmış veya süresi dolmuş. Yöneticinizden yeni bağlantı isteyin.',
    errorCode: 'INVALID_RESET_LINK',
  });

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async requestHelp(dto: PasswordHelpDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
        tenant: { slug: dto.tenantSlug, status: 'ACTIVE', deletedAt: null },
      },
      select: { id: true, tenantId: true, email: true },
    });
    if (user) {
      const admins = await this.prisma.user.findMany({
        where: notificationRecipients(user.tenantId, 'password-reset-request'),
        select: { id: true },
      });
      const day = new Date().toISOString().slice(0, 10);
      await this.prisma.$transaction(
        admins.map((admin) => {
          const sourceKey = `password-help:${user.id}:${day}:${admin.id}`;
          return this.prisma.notification.upsert({
            where: { sourceKey },
            update: {},
            create: {
              tenantId: user.tenantId,
              recipientUserId: admin.id,
              sourceKey,
              template: 'password-reset-request',
              title: 'Şifre kurtarma talebi',
              body: `${user.email} hesabı için şifre desteği istendi. Kimliği doğruladıktan sonra Personel Tanımları üzerinden kurtarma bağlantısı oluşturun.`,
              payload: { userId: user.id },
            },
          });
        }),
      );
    }
    return { message: PASSWORD_HELP_MESSAGE };
  }

  async issue(actor: AuthenticatedUser, userId: string, ctx: RequestContext) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      // Serialize issuance against resets and other user changes. A new link invalidates older ones.
      const stamp = new Date();
      const changed = await tx.user.updateMany({
        where: { id: userId, tenantId: actor.tenantId, status: 'ACTIVE', deletedAt: null },
        data: { updatedAt: stamp },
      });
      if (changed.count !== 1) throw new NotFoundException('Aktif kullanıcı bulunamadı.');
      await tx.passwordResetToken.updateMany({
        where: { userId, tenantId: actor.tenantId, usedAt: null },
        data: { usedAt: stamp },
      });
      await tx.passwordResetToken.create({
        data: {
          userId,
          tenantId: actor.tenantId,
          tokenHash: resetTokenHash(token),
          userStamp: stamp,
          expiresAt,
        },
      });
    });
    await this.audit.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      newValue: { passwordRecoveryLinkIssued: true, expiresAt: expiresAt.toISOString() },
      ...ctx,
    });
    return { token, expiresAt };
  }

  async reset(dto: ResetPasswordDto, ctx: RequestContext) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: resetTokenHash(dto.token) },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date()) throw invalid();
    const passwordHash = await hashPassword(dto.password);
    const revokedSessions = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: token.userId,
          tenantId: token.tenantId,
          updatedAt: token.userStamp,
          status: 'ACTIVE',
          deletedAt: null,
          tenant: { status: 'ACTIVE', deletedAt: null },
        },
        data: { passwordHash },
      });
      if (updated.count !== 1) throw invalid();
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw invalid();
      const sessions = await tx.refreshSession.updateMany({
        where: { userId: token.userId, tenantId: token.tenantId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return sessions.count;
    });
    await this.audit.log({
      tenantId: token.tenantId,
      userId: token.userId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: token.userId,
      newValue: { passwordReset: true, revokedSessions, source: 'recovery-link' },
      ...ctx,
    });
    return { message: 'Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.' };
  }
}
