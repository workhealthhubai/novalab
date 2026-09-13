import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@/config/configuration';
import type { RefreshSession } from '@/generated/prisma/client';
import type { RefreshSessionsRepository } from '../refresh-sessions.repository';
import type { UsersService } from '@/modules/users/users.service';
import { JwtStrategy } from './jwt.strategy';

const payload = {
  sub: 'user-1',
  tid: 'tenant-1',
  email: 'doctor@example.test',
  sid: 'session-1',
  type: 'access' as const,
};

const user = {
  id: payload.sub,
  tenantId: payload.tid,
  email: payload.email,
  firstName: 'Ada',
  lastName: 'Doctor',
  status: 'ACTIVE' as const,
  roles: ['occupational_physician'],
  permissions: [],
};

const activeSession = {
  id: payload.sid,
  userId: payload.sub,
  tenantId: payload.tid,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
} as RefreshSession;

describe('JwtStrategy session validation', () => {
  const users = { findAuthenticatedUser: jest.fn() } as unknown as jest.Mocked<UsersService>;
  const sessions = { findById: jest.fn() } as unknown as jest.Mocked<RefreshSessionsRepository>;
  const config = {
    get: jest.fn(() => ({ accessSecret: 'a'.repeat(48), issuer: 'test' })),
  } as unknown as ConfigService<AppConfig, true>;
  const strategy = new JwtStrategy(config, users, sessions);

  beforeEach(() => {
    jest.clearAllMocks();
    users.findAuthenticatedUser.mockResolvedValue({ user, tenantStatus: 'ACTIVE' });
    sessions.findById.mockResolvedValue(activeSession);
  });

  it('accepts an access token backed by an active session', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual({ ...user, sessionId: payload.sid });
  });

  it.each([
    null,
    { ...activeSession, revokedAt: new Date() },
    { ...activeSession, expiresAt: new Date(Date.now() - 1) },
    { ...activeSession, userId: 'other-user' },
    { ...activeSession, tenantId: 'other-tenant' },
  ])('rejects a missing, revoked, expired or mismatched session', async (session) => {
    sessions.findById.mockResolvedValue(session);
    await expect(strategy.validate(payload)).rejects.toMatchObject({
      response: { errorCode: 'SESSION_REVOKED' },
    });
  });

  it('rejects legacy or forged access tokens without a session id', async () => {
    await expect(strategy.validate({ ...payload, sid: undefined })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findAuthenticatedUser).not.toHaveBeenCalled();
  });
});
