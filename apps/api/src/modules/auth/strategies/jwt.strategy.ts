import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthenticatedUser } from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import { UsersService } from '@/modules/users/users.service';
import { RefreshSessionsRepository } from '../refresh-sessions.repository';

/**
 * Validates the access token and loads the principal (roles + permissions) from
 * the database on every request, so role changes and deactivations take effect
 * immediately. TODO(perf): cache the principal in Redis for a few seconds.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly sessions: RefreshSessionsRepository,
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
    if (!resolved || resolved.user.tenantId !== payload.tid) {
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
    return { ...resolved.user, sessionId: payload.sid };
  }
}
