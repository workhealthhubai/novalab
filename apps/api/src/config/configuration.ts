import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Env } from './env.schema';
import { validateEnv } from './env.schema';
import { parseDurationToSeconds } from '@/common/utils/duration';

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db?: number;
  tls?: Record<string, never>;
}

export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  app: {
    name: string;
    url: string;
    port: number;
    apiPrefix: string;
    logLevel: Env['LOG_LEVEL'];
    logSql: boolean;
    logHealthRequests: boolean;
    logPretty: boolean;
    corsOrigins: string[];
    requestBodyLimit: string;
    trustProxy: boolean;
    swaggerEnabled: boolean;
  };
  rateLimit: { ttlSeconds: number; limit: number };
  database: { url: string };
  redis: { url: string; connection: RedisConnectionConfig };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresInSeconds: number;
    refreshExpiresInSeconds: number;
    issuer: string;
  };
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
    region: string;
  };
  orthanc: { url: string; username: string; password: string; timeoutMs: number };
  viewer: { ohifPath: string };
  identity: {
    ocrEnabled: boolean;
    ocrLanguages: string;
    ocrFallbackLanguages: string;
    ocrLangPath: string;
    ocrCachePath: string;
    verificationProvider: 'none' | 'nvi';
    nviKpsUrl: string;
    nviKpsTimeoutMs: number;
  };
}

export function parseRedisUrl(url: string): RedisConnectionConfig {
  const parsed = new URL(url);
  const config: RedisConnectionConfig = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
  };
  if (parsed.password) config.password = decodeURIComponent(parsed.password);
  if (parsed.username) config.username = decodeURIComponent(parsed.username);
  const db = parsed.pathname.replace(/^\//, '');
  if (db) config.db = Number(db);
  if (parsed.protocol === 'rediss:') config.tls = {};
  return config;
}

/** Builds the typed configuration object from validated environment variables. */
export function buildConfig(env: Env): AppConfig {
  const isProduction = env.NODE_ENV === 'production';
  return {
    env: env.NODE_ENV,
    isProduction,
    app: {
      name: env.APP_NAME,
      url: env.APP_URL,
      port: env.API_PORT,
      apiPrefix: env.API_PREFIX.replace(/^\/+|\/+$/g, ''),
      logLevel: env.LOG_LEVEL,
      logSql: env.LOG_SQL,
      logHealthRequests: env.LOG_HEALTH_REQUESTS,
      logPretty: env.LOG_PRETTY && !isProduction,
      corsOrigins: env.CORS_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      requestBodyLimit: env.REQUEST_BODY_LIMIT,
      trustProxy: env.TRUST_PROXY,
      swaggerEnabled: env.SWAGGER_ENABLED ?? !isProduction,
    },
    rateLimit: { ttlSeconds: env.RATE_LIMIT_TTL, limit: env.RATE_LIMIT_LIMIT },
    database: { url: env.DATABASE_URL },
    redis: { url: env.REDIS_URL, connection: parseRedisUrl(env.REDIS_URL) },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresInSeconds: parseDurationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
      refreshExpiresInSeconds: parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
      issuer: env.JWT_ISSUER,
    },
    minio: {
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
      bucket: env.MINIO_BUCKET,
      region: env.MINIO_REGION,
    },
    orthanc: {
      url: env.ORTHANC_URL.replace(/\/+$/, ''),
      username: env.ORTHANC_USERNAME,
      password: env.ORTHANC_PASSWORD,
      timeoutMs: env.ORTHANC_TIMEOUT_MS,
    },
    viewer: { ohifPath: env.OHIF_VIEWER_PATH.replace(/\/+$/, '') },
    identity: {
      ocrEnabled: env.OCR_ENABLED,
      ocrLanguages: env.OCR_LANGUAGES,
      ocrFallbackLanguages: env.OCR_FALLBACK_LANGUAGES,
      ocrLangPath: env.OCR_LANG_PATH ?? resolve(process.cwd(), 'tessdata'),
      ocrCachePath: env.OCR_CACHE_PATH ?? join(tmpdir(), 'osgb-tessdata'),
      verificationProvider: env.IDENTITY_VERIFICATION_PROVIDER,
      nviKpsUrl: env.NVI_KPS_URL,
      nviKpsTimeoutMs: env.NVI_KPS_TIMEOUT_MS,
    },
  };
}

/** ConfigModule `load` factory: validates process.env and returns the typed config. */
export const configuration = (): AppConfig => buildConfig(validateEnv(process.env));
