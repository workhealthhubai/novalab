import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Monorepo layout: prefer apps/api/.env, fall back to the repository root .env.
loadEnv({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
  quiet: true,
});

/**
 * Prisma 7 configuration. The datasource URL lives here (not in schema.prisma).
 * `prisma generate` does not need a database, so an unset DATABASE_URL must not throw;
 * migration commands fail loudly with an empty URL, which is the desired behaviour.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
