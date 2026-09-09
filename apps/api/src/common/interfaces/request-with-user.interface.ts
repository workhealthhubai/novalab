import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.interface';

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/** Client context captured for audit logs. */
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/** Correlation id set by RequestIdMiddleware (typed loosely by pino-http). */
export function getRequestId(req: Request): string | undefined {
  const id = (req as Request & { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : undefined;
}

export function extractRequestContext(req: RequestWithUser): RequestContext {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: getRequestId(req),
  };
}
