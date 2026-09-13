import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { PinoLogger } from 'nestjs-pino';
import { AuditAction, PERMISSIONS } from '@osgb/shared-types';
import type { AuthenticatedUser } from '@/common/interfaces';
import type { AppConfig } from '@/config/configuration';
import type { RefreshSession } from '@/generated/prisma/client';
import type { PrismaService } from '@/infrastructure/prisma/prisma.service';
import type { AuditService } from '@/modules/audit/audit.service';
import { hashPassword } from '@/modules/users/users.service';
import type { UsersService } from '@/modules/users/users.service';
import type { UsersRepository } from '@/modules/users/users.repository';
import { AuthService } from './auth.service';
import {
  RefreshSessionAlreadyConsumedError,
  type RefreshSessionsRepository,
} from './refresh-sessions.repository';

const jwtConfig: AppConfig['jwt'] = {
  accessSecret: 'a'.repeat(48),
  refreshSecret: 'b'.repeat(48),
  accessExpiresInSeconds: 900,
  refreshExpiresInSeconds: 3600,
  issuer: 'test',
};

const authUser: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  email: 'admin@demo.local',
  firstName: 'Demo',
  lastName: 'Admin',
  status: 'ACTIVE',
  roles: ['tenant_admin'],
  permissions: [PERMISSIONS.USERS_READ, PERMISSIONS.RADIOLOGY_READ],
};

describe('AuthService', () => {
  let service: AuthService;
  let passwordHash: string;
  const sessions = new Map<string, RefreshSession>();

  const usersRepository = { findForLogin: jest.fn() } as unknown as jest.Mocked<UsersRepository>;
  const usersService = {
    findAuthenticatedUser: jest.fn(),
    touchLastLogin: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<UsersService>;
  const audit = {
    log: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AuditService>;
  const findRadiologyRequest = jest.fn();
  const prisma = {
    radiologyRequest: { findFirst: findRadiologyRequest },
  } as unknown as PrismaService;
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  const refreshSessions = {
    create: jest.fn(
      async (
        data: Omit<RefreshSession, 'revokedAt' | 'replacedById' | 'createdAt' | 'updatedAt'>,
      ) => {
        const session: RefreshSession = {
          ...data,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null,
          revokedAt: null,
          replacedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sessions.set(session.id, session);
        return session;
      },
    ),
    rotate: jest.fn(
      async (
        consumed: { id: string; tokenHash: string },
        data: Omit<RefreshSession, 'revokedAt' | 'replacedById' | 'createdAt' | 'updatedAt'>,
      ) => {
        const old = sessions.get(consumed.id);
        if (
          !old ||
          old.tokenHash !== consumed.tokenHash ||
          old.revokedAt ||
          old.replacedById ||
          old.expiresAt.getTime() <= Date.now()
        )
          throw new RefreshSessionAlreadyConsumedError();
        old.revokedAt = new Date();
        old.replacedById = data.id;
        const replacement: RefreshSession = {
          ...data,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null,
          revokedAt: null,
          replacedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sessions.set(replacement.id, replacement);
        return replacement;
      },
    ),
    findById: jest.fn(async (id: string) => sessions.get(id) ?? null),
    revoke: jest.fn(async (id: string, replacedById?: string) => {
      const s = sessions.get(id);
      if (s) Object.assign(s, { revokedAt: new Date(), replacedById: replacedById ?? null });
    }),
    revokeAllForUser: jest.fn(async (userId: string) => {
      let n = 0;
      for (const s of sessions.values()) {
        if (s.userId === userId && !s.revokedAt) {
          s.revokedAt = new Date();
          n += 1;
        }
      }
      return n;
    }),
  } as unknown as jest.Mocked<RefreshSessionsRepository>;

  beforeAll(async () => {
    passwordHash = await hashPassword('Admin123!');
  });

  beforeEach(() => {
    sessions.clear();
    jest.clearAllMocks();
    const config = { get: jest.fn(() => jwtConfig) } as unknown as ConfigService<AppConfig, true>;
    service = new AuthService(
      config,
      new JwtService({}),
      usersService,
      usersRepository,
      refreshSessions,
      prisma,
      audit,
      logger,
    );
    usersRepository.findForLogin.mockResolvedValue([
      {
        ...authUser,
        passwordHash,
        tenant: { id: authUser.tenantId, status: 'ACTIVE', slug: 'demo' },
      } as never,
    ]);
    usersService.findAuthenticatedUser.mockResolvedValue({
      user: authUser,
      tenantStatus: 'ACTIVE',
    });
  });

  it('logs in with valid credentials and stores only a hash of the refresh token', async () => {
    const result = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});

    expect(result.user).toEqual(authUser);
    expect(result.tokenType).toBe('Bearer');
    expect(result.expiresIn).toBe(900);
    expect(result.accessToken).not.toEqual(result.refreshToken);

    const [session] = [...sessions.values()];
    expect(session?.tokenHash).toBe(createHash('sha256').update(result.refreshToken).digest('hex'));
    expect(session?.tokenHash).not.toContain(result.refreshToken);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.LOGIN, userId: authUser.id }),
    );
  });

  it('rejects a wrong password with a generic error and audits the failure', async () => {
    await expect(
      service.login({ email: 'admin@demo.local', password: 'nope' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.LOGIN_FAILED }),
    );
  });

  it('rejects unknown users without revealing whether the account exists', async () => {
    usersRepository.findForLogin.mockResolvedValue([]);
    await expect(
      service.login({ email: 'ghost@demo.local', password: 'x' }, {}),
    ).rejects.toMatchObject({
      response: { errorCode: 'INVALID_CREDENTIALS' },
    });
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rotates refresh tokens and detects reuse of a rotated token', async () => {
    const first = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    const second = await service.refresh(first.refreshToken, {});
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // Old session is revoked and linked to the new one.
    const revoked = [...sessions.values()].find((s) => s.revokedAt);
    expect(revoked?.replacedById).toBeTruthy();

    // Presenting the old token again revokes every session for the user.
    await expect(service.refresh(first.refreshToken, {})).rejects.toMatchObject({
      response: { errorCode: 'REFRESH_TOKEN_REUSED' },
    });
    expect(refreshSessions.revokeAllForUser).toHaveBeenCalledWith(authUser.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.TOKEN_REUSE_DETECTED }),
    );

    await expect(service.refresh(second.refreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('consumes a refresh token only once under concurrent rotation', async () => {
    const first = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    const results = await Promise.allSettled([
      service.refresh(first.refreshToken, {}),
      service.refresh(first.refreshToken, {}),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(refreshSessions.rotate).toHaveBeenCalledTimes(2);
    expect(refreshSessions.revokeAllForUser).toHaveBeenCalledWith(authUser.id);
    expect([...sessions.values()].filter((session) => !session.revokedAt)).toHaveLength(0);
  });

  it('rejects a session revoked by logout/admin without revoking the other sessions', async () => {
    const login = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    const live = [...sessions.values()].find((s) => !s.revokedAt);
    expect(live).toBeTruthy();
    live!.revokedAt = new Date(); // admin sign-out: revoked, but never rotated
    await expect(service.refresh(login.refreshToken, {})).rejects.toMatchObject({
      response: { errorCode: 'SESSION_REVOKED' },
    });
    expect(refreshSessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('logout revokes the session and is idempotent for garbage tokens', async () => {
    const login = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    await service.logout(login.refreshToken, {});
    expect([...sessions.values()][0]?.revokedAt).toBeTruthy();
    await expect(service.logout('not-a-token', {})).resolves.toBeUndefined();
  });

  it('issues and verifies a DICOMweb token scoped to one session, patient and study', async () => {
    const login = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    const access = new JwtService({}).decode<{ sid: string }>(login.accessToken);
    const viewerUser = { ...authUser, sessionId: access.sid };
    const scope = {
      radiologyRequestId: 'request-1',
      employeeId: 'employee-1',
      studyInstanceUid: '1.2.3.4',
    };
    findRadiologyRequest.mockResolvedValue({ id: scope.radiologyRequestId });

    const { token, maxAgeSeconds } = service.issueDicomWebToken(viewerUser, scope);
    await expect(
      service.verifyDicomWebAccess(
        token,
        `/dicom-web/studies/${scope.studyInstanceUid}/metadata`,
        'GET',
      ),
    ).resolves.toMatchObject({
      sub: authUser.id,
      tid: authUser.tenantId,
      sid: access.sid,
      rid: scope.radiologyRequestId,
      eid: scope.employeeId,
      suid: scope.studyInstanceUid,
      type: 'dicomweb',
    });
    expect(maxAgeSeconds).toBe(300);
    await expect(
      service.verifyDicomWebAccess(token, '/dicom-web/studies/9.9.9/metadata', 'GET'),
    ).rejects.toMatchObject({ response: { errorCode: 'DICOMWEB_SCOPE_VIOLATION' } });
    await expect(
      service.verifyDicomWebAccess('bad', '/dicom-web/studies/1.2.3.4/metadata', 'GET'),
    ).rejects.toBeDefined();
  });

  it('invalidates DICOMweb access when the login session is revoked', async () => {
    const login = await service.login({ email: 'admin@demo.local', password: 'Admin123!' }, {});
    const access = new JwtService({}).decode<{ sid: string }>(login.accessToken);
    const scope = {
      radiologyRequestId: 'request-1',
      employeeId: 'employee-1',
      studyInstanceUid: '1.2.3.4',
    };
    findRadiologyRequest.mockResolvedValue({ id: scope.radiologyRequestId });
    const { token } = service.issueDicomWebToken({ ...authUser, sessionId: access.sid }, scope);
    await refreshSessions.revoke(access.sid);

    await expect(
      service.verifyDicomWebAccess(token, '/dicom-web/studies/1.2.3.4/metadata', 'GET'),
    ).rejects.toMatchObject({ response: { errorCode: 'DICOMWEB_SESSION_INVALID' } });
  });
});
