import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessTokenPayload, AuthenticatedUser } from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import { UsersService } from '@/modules/users/users.service';

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
    if (payload.type !== 'access') {
      throw new UnauthorizedException({
        message: 'Invalid token type',
        errorCode: 'INVALID_TOKEN',
      });
    }
    const resolved = await this.users.findAuthenticatedUser(payload.sub);
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
    return resolved.user;
  }
}
