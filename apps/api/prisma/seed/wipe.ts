/* eslint-disable no-console */
/**
 * Removes every piece of application data so the demo seed starts from a clean slate:
 * all Postgres tables (except migrations and the global location reference data), every object
 * in the MinIO bucket, every study in Orthanc and the Redis queue database.
 */
import { Redis } from 'ioredis';
import type { PrismaClient } from '../../src/generated/prisma/client';
import type { SeedOrthanc, SeedStorage } from './lib';

/** Global reference tables (Turkish provinces/districts/neighbourhoods) are kept and upserted. */
const KEEP_TABLES = new Set(['_prisma_migrations', 'provinces', 'districts', 'neighborhoods']);

export async function wipeDatabase(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const tables = rows.map((r) => r.tablename).filter((t) => !KEEP_TABLES.has(t));
  if (tables.length === 0) return [];
  const list = tables.map((t) => `"public"."${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  return tables;
}

export async function wipeStorage(storage: SeedStorage | null): Promise<void> {
  if (!storage) {
    console.log('… MinIO not configured, skipping object wipe');
    return;
  }
  try {
    const removed = await storage.wipe();
    console.log(`✔ MinIO bucket "${storage.bucket}" emptied (${removed} objects)`);
  } catch (error) {
    console.warn(`⚠ MinIO wipe failed: ${(error as Error).message}`);
  }
}

export async function wipeOrthanc(orthanc: SeedOrthanc | null): Promise<void> {
  if (!orthanc) {
    console.log('… Orthanc not configured, skipping PACS wipe');
    return;
  }
  try {
    const removed = await orthanc.wipe();
    console.log(`✔ Orthanc emptied (${removed} patients)`);
  } catch (error) {
    console.warn(`⚠ Orthanc wipe failed: ${(error as Error).message}`);
  }
}

export async function wipeRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) return;
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    await redis.flushdb();
    console.log('✔ Redis queue database flushed');
  } catch (error) {
    console.warn(`⚠ Redis flush failed: ${(error as Error).message}`);
  } finally {
    redis.disconnect();
  }
}
