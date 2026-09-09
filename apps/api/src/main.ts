import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import type { AppConfig } from './config/configuration';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Body parsers are registered below with explicit size limits.
    bodyParser: false,
  });

  const config = app.get(ConfigService<AppConfig, true>);
  const appConfig = config.get('app', { infer: true });
  const isProduction = config.get('isProduction', { infer: true });

  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  // Behind Nginx: trust the first proxy hop so req.ip / secure cookies work.
  app.set('trust proxy', appConfig.trustProxy ? 1 : false);
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.useBodyParser('json', { limit: appConfig.requestBodyLimit });
  app.useBodyParser('urlencoded', { extended: true, limit: appConfig.requestBodyLimit });

  app.use(
    helmet({
      // The API only serves JSON; a strict CSP is harmless here and protects Swagger UI.
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: isProduction ? { maxAge: 15_552_000, includeSubDomains: true } : false,
    }),
  );

  app.enableCors({
    origin: appConfig.corsOrigins.length > 0 ? appConfig.corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });

  // Health endpoints stay outside the prefix for container probes.
  app.setGlobalPrefix(appConfig.apiPrefix, { exclude: ['health', 'health/live', 'health/ready'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
      stopAtFirstError: false,
    }),
  );

  app.enableShutdownHooks();

  if (appConfig.swaggerEnabled) {
    const docsPath = setupSwagger(app, appConfig.apiPrefix);
    logger.log(`Swagger UI available at /${docsPath}`);
  }

  await app.listen(appConfig.port, '0.0.0.0');
  logger.log(
    `API listening on port ${appConfig.port} (prefix: /${appConfig.apiPrefix}, env: ${config.get('env', { infer: true })})`,
  );
}

bootstrap().catch((error: unknown) => {
  // Logger may not be initialised yet (e.g. env validation failure).
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
