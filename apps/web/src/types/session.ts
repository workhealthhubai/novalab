import type { UserStatus } from '@osgb/shared-types';

export interface ActiveSession {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: string;
  /** Last token refresh = last activity (rotation replaces the row). */
  createdAt: string;
  updatedAt: string;
  /** The session of the signed-in admin viewing the list. */
  current: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: UserStatus;
    lastLoginAt: string | null;
  };
}
