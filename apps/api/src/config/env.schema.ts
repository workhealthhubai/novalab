import { z } from 'zod';

const booleanFromString = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off', ''].includes(normalized)) return false;
  return value;
}, z.boolean());

const PLACEHOLDER_SECRET_PATTERN = /change-me|changeme|secret-at-least|example/i;

/**
 * Environment schema. Validation happens once at bootstrap; the process refuses
 * to start with an invalid configuration (fail fast).
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().default('osgb-platform'),
    APP_URL: z.url().default('http://localhost:8080'),

    API_PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('api'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    LOG_SQL: booleanFromString.default(false),
    LOG_HEALTH_REQUESTS: booleanFromString.default(false),
    /** Human readable logs via pino-pretty (dev dependency) - never enable in production images. */
    LOG_PRETTY: booleanFromString.default(false),
    CORS_ORIGIN: z.string().default(''),
    REQUEST_BODY_LIMIT: z.string().default('1mb'),
    RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(120),
    TRUST_PROXY: booleanFromString.default(false),
    SWAGGER_ENABLED: booleanFromString.optional(),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    JWT_ISSUER: z.string().default('osgb-platform'),

    MINIO_ENDPOINT: z.string().min(1),
    MINIO_PORT: z.coerce.number().int().positive().default(9000),
    MINIO_USE_SSL: booleanFromString.default(false),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    MINIO_BUCKET: z.string().min(1).default('osgb-documents'),
    MINIO_REGION: z.string().default('us-east-1'),

    ORTHANC_URL: z.url(),
    ORTHANC_USERNAME: z.string().min(1),
    ORTHANC_PASSWORD: z.string().min(1),
    ORTHANC_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    OHIF_VIEWER_PATH: z.string().default('/viewer'),

    // Identity: OCR of ID cards and official verification
    OCR_ENABLED: booleanFromString.default(true),
    OCR_LANGUAGES: z.string().default('mrz'),
    OCR_FALLBACK_LANGUAGES: z.string().default('eng'),
    OCR_LANG_PATH: z.string().optional(),
    OCR_CACHE_PATH: z.string().optional(),
    IDENTITY_VERIFICATION_PROVIDER: z.enum(['none', 'nvi']).default('none'),
    NVI_KPS_URL: z.url().default('https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx'),
    NVI_KPS_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET in production',
      });
    }
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (PLACEHOLDER_SECRET_PATTERN.test(env[key])) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} still contains a placeholder value; set a real secret in production`,
        });
      }
    }
    if (!env.CORS_ORIGIN) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'CORS_ORIGIN must be set explicitly in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.forRoot({ validate }). Throws a readable error on failure. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}
