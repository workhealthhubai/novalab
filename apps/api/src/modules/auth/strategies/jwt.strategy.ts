import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthenticatedUser } from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { RefreshSessionsRepository } from '../refresh-sessions.repository';

/**
 * Validates the access token and loads the principal (roles + permissions) from
 * the database on every request, so role changes and deactivations take effect
 * immediately. Supports Super Admin tenant switching across all tenants.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly sessions: RefreshSessionsRepository,
    private readonly prisma: PrismaService,
  ) {
    const jwt = config.get('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwt.accessSecret,
      issuer: jwt.issuer,
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access' || !payload.sid) {
      throw new UnauthorizedException({
        message: 'Invalid token type',
        errorCode: 'INVALID_TOKEN',
      });
    }
    const [resolved, session] = await Promise.all([
      this.users.findAuthenticatedUser(payload.sub),
      this.sessions.findById(payload.sid),
    ]);
    if (!resolved) {
      throw new UnauthorizedException({
        message: 'Session is no longer valid',
        errorCode: 'INVALID_TOKEN',
      });
    }

    const isSuperAdmin = Boolean(resolved.user.isSuperAdmin);

    // Regular users can only access their home tenant.
    if (!isSuperAdmin && resolved.user.tenantId !== payload.tid) {
      throw new UnauthorizedException({
        message: 'Session is no longer valid',
        errorCode: 'INVALID_TOKEN',
      });
    }
    if (resolved.user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'Account is not active',
        errorCode: 'ACCOUNT_INACTIVE',
      });
    }
    if (resolved.tenantStatus !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'Tenant is suspended',
        errorCode: 'TENANT_SUSPENDED',
      });
    }
    if (
      !session ||
      session.userId !== payload.sub ||
      session.tenantId !== payload.tid ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException({
        message: 'Session is no longer valid',
        errorCode: 'SESSION_REVOKED',
      });
    }

    let activeTenantName: string | undefined;
    if (isSuperAdmin && payload.tid !== resolved.user.tenantId) {
      const targetTenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tid, deletedAt: null },
        select: { id: true, name: true, status: true },
      });
      if (!targetTenant || targetTenant.status !== 'ACTIVE') {
        throw new UnauthorizedException({
          message: 'Target tenant is suspended or not found',
          errorCode: 'TENANT_SUSPENDED',
        });
      }
      activeTenantName = targetTenant.name;
    }

    return {
      ...resolved.user,
      tenantId: payload.tid,
      originalTenantId: resolved.user.tenantId,
      activeTenantName,
      sessionId: payload.sid,
    };
  }
}
