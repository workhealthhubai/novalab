-- Turkish-aware duplicate key: maintained by the API (toLocaleLowerCase('tr-TR')); SQL lower() is
-- only a best-effort backfill for rows that predate the column.
ALTER TABLE "occupations" ADD COLUMN "nameKey" TEXT NOT NULL DEFAULT '';
UPDATE "occupations" SET "nameKey" = lower("name");
ALTER TABLE "occupations" ALTER COLUMN "nameKey" DROP DEFAULT;
DROP INDEX IF EXISTS "occupations_tenantId_name_active_key";
CREATE INDEX "occupations_tenantId_nameKey_idx" ON "occupations" ("tenantId", "nameKey");
CREATE UNIQUE INDEX "occupations_tenantId_nameKey_active_key" ON "occupations" ("tenantId", "nameKey") WHERE "deletedAt" IS NULL;
