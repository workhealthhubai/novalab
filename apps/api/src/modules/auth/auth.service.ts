import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { AuditAction, PERMISSIONS, type LoginResponse, type TokenPair } from '@osgb/shared-types';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
  RequestContext,
} from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { UsersService, hashPassword, verifyPassword } from '@/modules/users/users.service';
import { UsersRepository } from '@/modules/users/users.repository';
import type { LoginDto } from './dto/login.dto';
import { assertDicomWebRequestScope } from './dicomweb-access';
import {
  RefreshSessionAlreadyConsumedError,
  RefreshSessionsRepository,
} from './refresh-sessions.repository';

/** Short-lived token that lets the browser reach DICOMweb through Nginx (auth_request). */
export interface DicomWebTokenPayload {
  sub: string;
  tid: string;
  sid: string;
  rid: string;
  eid: string;
  suid: string;
  type: 'dicomweb';
}

export interface DicomWebScope {
  radiologyRequestId: string;
  employeeId: string;
  studyInstanceUid: string;
}

export const DICOMWEB_COOKIE = 'osgb_dicomweb';
const DICOMWEB_TOKEN_TTL_SECONDS = 5 * 60;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly jwtConfig: AppConfig['jwt'];
  private dummyHashPromise: Promise<string> | null = null;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly sessions: RefreshSessionsRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
    this.jwtConfig = config.get('jwt', { infer: true });
  }

  async login(dto: LoginDto, ctx: RequestContext): Promise<LoginResponse> {
    const candidates = await this.usersRepository.findForLogin(dto.email, dto.tenantSlug);
    if (candidates.length > 1) {
      throw new BadRequestException({
        message: 'This e-mail exists in multiple tenants; provide tenantSlug',
        errorCode: 'TENANT_REQUIRED',
      });
    }
    const user = candidates[0];

    // Constant-time-ish behaviour: always run one argon2 verification.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordOk = await verifyPassword(hash, dto.password);

    if (!user || !passwordOk) {
      if (user) {
        await this.audit.log({
          tenantId: user.tenantId,
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          entityType: 'User',
          entityId: user.id,
          ...ctx,
        });
      }
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'Account is not active',
        errorCode: 'ACCOUNT_INACTIVE',
      });
    }
    if (user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'Tenant is suspended',
        errorCode: 'TENANT_SUSPENDED',
      });
    }

    const resolved = await this.users.findAuthenticatedUser(user.id);
    if (!resolved) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokenPair(resolved.user, ctx);
    await this.users.touchLastLogin(user.id);
    await this.audit.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ...ctx,
    });
    return { ...tokens, user: resolved.user };
  }

  /**
   * Refresh token rotation with reuse detection:
   * a presented token that belongs to an already-rotated session (or whose hash does not match)
   * revokes every session of that user (the token was probably stolen). A session merely revoked
   * by logout/admin is rejected without that cascade.
   */
  async refresh(refreshToken: string, ctx: RequestContext): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(refreshToken, false);
    const session = await this.sessions.findById(payload.sid);
    const presentedHash = sha256(refreshToken);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }
    // Reuse = a token that was already rotated (replacedById set) or one that does not match the
    // stored hash. A session revoked by logout or by an admin is simply dead: rejecting it must
    // not cascade to the user's other devices.
    if (session.revokedAt && !session.replacedById && session.tokenHash === presentedHash) {
      throw new UnauthorizedException({
        message: 'Session has been signed out',
        errorCode: 'SESSION_REVOKED',
      });
    }
    if (session.revokedAt || session.tokenHash !== presentedHash) {
      return this.rejectRefreshReuse(session, ctx);
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({
        message: 'Refresh token expired',
        errorCode: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    const resolved = await this.users.findAuthenticatedUser(session.userId);
    if (!resolved || resolved.user.status !== 'ACTIVE' || resolved.tenantStatus !== 'ACTIVE') {
      throw new UnauthorizedException({
        message: 'Account is not active',
        errorCode: 'ACCOUNT_INACTIVE',
      });
    }

    try {
      return await this.issueTokenPair(resolved.user, ctx, {
        id: session.id,
        tokenHash: presentedHash,
      });
    } catch (error) {
      if (error instanceof RefreshSessionAlreadyConsumedError) {
        return this.rejectRefreshReuse(session, ctx);
      }
      throw error;
    }
  }

  async logout(refreshToken: string, ctx: RequestContext): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.verifyRefreshToken(refreshToken, true);
    } catch {
      return; // Invalid token: nothing to revoke, do not leak information.
    }
    const session = await this.sessions.findById(payload.sid);
    if (!session || session.userId !== payload.sub) return;
    await this.sessions.revoke(session.id);
    await this.audit.log({
      tenantId: session.tenantId,
      userId: session.userId,
      action: AuditAction.LOGOUT,
      entityType: 'RefreshSession',
      entityId: session.id,
      ...ctx,
    });
  }

  issueDicomWebToken(
    user: AuthenticatedUser,
    scope: DicomWebScope,
  ): { token: string; maxAgeSeconds: number } {
    if (!user.sessionId) {
      throw new UnauthorizedException({
        message: 'A revocable login session is required for DICOMweb access',
        errorCode: 'SESSION_REQUIRED',
      });
    }
    const payload: DicomWebTokenPayload = {
      sub: user.id,
      tid: user.tenantId,
      sid: user.sessionId,
      rid: scope.radiologyRequestId,
      eid: scope.employeeId,
      suid: scope.studyInstanceUid,
      type: 'dicomweb',
    };
    const token = this.jwt.sign(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: DICOMWEB_TOKEN_TTL_SECONDS,
      issuer: this.jwtConfig.issuer,
    });
    return { token, maxAgeSeconds: DICOMWEB_TOKEN_TTL_SECONDS };
  }

  async verifyDicomWebAccess(
    token: string,
    originalUri: string,
    originalMethod: string,
  ): Promise<DicomWebTokenPayload> {
    const payload = this.jwt.verify<DicomWebTokenPayload>(token, {
      secret: this.jwtConfig.accessSecret,
      issuer: this.jwtConfig.issuer,
    });
    if (
      payload.type !== 'dicomweb' ||
      !payload.sub ||
      !payload.tid ||
      !payload.sid ||
      !payload.rid ||
      !payload.eid ||
      !payload.suid
    )
      throw new UnauthorizedException('Invalid token type');

    assertDicomWebRequestScope(originalUri, originalMethod, payload.suid);

    const [resolved, session, request] = await Promise.all([
      this.users.findAuthenticatedUser(payload.sub),
      this.sessions.findById(payload.sid),
      this.prisma.radiologyRequest.findFirst({
        where: {
          id: payload.rid,
          tenantId: payload.tid,
          employeeId: payload.eid,
          studyInstanceUid: payload.suid,
          deletedAt: null,
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      }),
    ]);
    const activePrincipal =
      resolved?.user.status === 'ACTIVE' &&
      resolved.tenantStatus === 'ACTIVE' &&
      resolved.user.tenantId === payload.tid &&
      resolved.user.permissions.includes(PERMISSIONS.RADIOLOGY_READ);
    const activeSession =
      session &&
      session.userId === payload.sub &&
      session.tenantId === payload.tid &&
      !session.revokedAt &&
      session.expiresAt.getTime() > Date.now();
    if (!activePrincipal || !activeSession || !request) {
      throw new UnauthorizedException({
        message: 'Viewer session is no longer valid',
        errorCode: 'DICOMWEB_SESSION_INVALID',
      });
    }
    return payload;
  }

  private async issueTokenPair(
    user: AuthenticatedUser,
    ctx: RequestContext,
    rotatedFrom?: { id: string; tokenHash: string },
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      tid: user.tenantId,
      email: user.email,
      sid: sessionId,
      type: 'access',
    };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessExpiresInSeconds,
      issuer: this.jwtConfig.issuer,
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tid: user.tenantId,
      sid: sessionId,
      type: 'refresh',
    };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.jwtConfig.refreshSecret,
      expiresIn: this.jwtConfig.refreshExpiresInSeconds,
      issuer: this.jwtConfig.issuer,
    });

    const sessionData = {
      id: sessionId,
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + this.jwtConfig.refreshExpiresInSeconds * 1000),
      userAgent: ctx.userAgent,
      ipAddress: ctx.ipAddress,
    };
    if (rotatedFrom) await this.sessions.rotate(rotatedFrom, sessionData);
    else await this.sessions.create(sessionData);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtConfig.accessExpiresInSeconds,
      tokenType: 'Bearer',
    };
  }

  private async rejectRefreshReuse(
    session: { id: string; userId: string; tenantId: string },
    ctx: RequestContext,
  ): Promise<never> {
    const revoked = await this.sessions.revokeAllForUser(session.userId);
    this.logger.warn({ userId: session.userId, revoked }, 'Refresh token reuse detected');
    await this.audit.log({
      tenantId: session.tenantId,
      userId: session.userId,
      action: AuditAction.TOKEN_REUSE_DETECTED,
      entityType: 'RefreshSession',
      entityId: session.id,
      ...ctx,
    });
    throw new UnauthorizedException({
      message: 'Refresh token reuse detected',
      errorCode: 'REFRESH_TOKEN_REUSED',
    });
  }

  private verifyRefreshToken(token: string, ignoreExpiration: boolean): RefreshTokenPayload {
    try {
      const payload = this.jwt.verify<RefreshTokenPayload>(token, {
        secret: this.jwtConfig.refreshSecret,
        issuer: this.jwtConfig.issuer,
        ignoreExpiration,
      });
      if (payload.type !== 'refresh' || !payload.sid || !payload.sub)
        throw new Error('bad payload');
      return payload;
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHashPromise ??= hashPassword(randomUUID());
    return this.dummyHashPromise;
  }
}
