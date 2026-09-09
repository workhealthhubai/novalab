import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Assigns a correlation id to every request. Honors an incoming `x-request-id`
 * (e.g. from Nginx) when it is well-formed, otherwise generates a UUID.
 * The id is echoed back in the response and attached to all log lines.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const id = candidate && SAFE_ID.test(candidate) ? candidate : randomUUID();
  (req as Request & { id?: string }).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
