import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PinoLogger } from 'nestjs-pino';
import type { AppConfig } from '@/config/configuration';
import { Prisma, PrismaClient } from '@/generated/prisma/client';

/** Narrow view of the client used only to subscribe to its log events. */
interface PrismaLogEvents {
  $on(event: 'query', callback: (event: Prisma.QueryEvent) => void): unknown;
  $on(event: 'warn' | 'error', callback: (event: Prisma.LogEvent) => void): unknown;
}

/**
 * Application database client.
 *
 * - `passwordHash` is omitted from every User query by default; auth code opts back in
 *   explicitly with `omit: { passwordHash: false }`.
 * - `photoKey` (storage path of the patient portrait) is likewise hidden from API responses;
 *   EmployeesRepository.findPhotoKey reads it for the photo endpoints.
 * - Tenant scoping is NOT automatic; repositories must always filter by tenantId.
 * - Prisma's own log events are routed through pino (structured, correlated); with LOG_SQL=true
 *   every statement is logged at debug level (query text only, never parameters).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    const adapter = new PrismaPg({ connectionString: config.get('database', { infer: true }).url });
    const logSql = config.get('app', { infer: true }).logSql;
    const log: Prisma.LogDefinition[] = [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
      ...(logSql ? [{ emit: 'event' as const, level: 'query' as const }] : []),
    ];
    super({ adapter, omit: { user: { passwordHash: true }, employee: { photoKey: true } }, log });
    this.logger.setContext(PrismaService.name);

    const events = this as unknown as PrismaLogEvents;
    events.$on('error', (event) => this.logger.error({ target: event.target }, event.message));
    events.$on('warn', (event) => this.logger.warn({ target: event.target }, event.message));
    if (logSql) {
      events.$on('query', (event) =>
        this.logger.debug({ durationMs: event.duration, query: event.query }, 'sql'),
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.info('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Lightweight connectivity probe used by readiness checks. */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
