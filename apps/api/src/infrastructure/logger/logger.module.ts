import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import type { AppConfig } from '@/config/configuration';

/** pino-pretty is a dev dependency; fall back to JSON logs when it is not installed. */
function isPinoPrettyAvailable(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

/**
 * Structured JSON logging (pino) with request correlation.
 *
 * Sensitive fields are redacted at the logger level so that tokens, passwords,
 * password hashes and medical free-text can never end up in log storage.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const app = config.get('app', { infer: true });
        return {
          pinoHttp: {
            level: app.logLevel,
            genReqId: (req: IncomingMessage) => (req as IncomingMessage & { id?: string }).id ?? '',
            autoLogging: {
              ignore: (req: IncomingMessage) =>
                !app.logHealthRequests && (req.url ?? '').includes('/health'),
            },
            // Evaluated when the response finishes, so the authenticated principal is available.
            customProps: (req: IncomingMessage) => {
              const r = req as IncomingMessage & {
                user?: { id: string; tenantId: string };
                route?: { path?: string };
              };
              return {
                requestId: r.id,
                userId: r.user?.id,
                tenantId: r.user?.tenantId,
                route: r.route?.path,
              };
            },
            customLogLevel: (_req: IncomingMessage, res: { statusCode: number }, error?: Error) => {
              if (error || res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (req: IncomingMessage, res: { statusCode: number }) =>
              `${req.method ?? ''} ${req.url ?? ''} -> ${res.statusCode}`,
            customErrorMessage: (req: IncomingMessage, res: { statusCode: number }) =>
              `${req.method ?? ''} ${req.url ?? ''} -> ${res.statusCode}`,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                '*.password',
                '*.passwordHash',
                '*.accessToken',
                '*.refreshToken',
                '*.findings',
                '*.conclusion',
                '*.reportText',
                '*.nationalId',
              ],
              censor: '[REDACTED]',
            },
            serializers: {
              req: (req: { id: string; method: string; url: string; remoteAddress?: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
              }),
            },
            ...(app.logPretty && isPinoPrettyAvailable()
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { singleLine: true, colorize: true, translateTime: 'HH:MM:ss' },
                  },
                }
              : {}),
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
