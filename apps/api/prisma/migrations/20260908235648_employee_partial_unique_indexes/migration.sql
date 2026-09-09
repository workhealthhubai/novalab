-- Soft-deleted employees must not block re-registration of the same person:
-- replace the full unique constraints with partial unique indexes over active rows.
DROP INDEX IF EXISTS "employees_tenantId_nationalId_key";
DROP INDEX IF EXISTS "employees_tenantId_registrationNumber_key";

CREATE INDEX "employees_tenantId_nationalId_idx" ON "employees"("tenantId", "nationalId");
CREATE INDEX "employees_tenantId_registrationNumber_idx" ON "employees"("tenantId", "registrationNumber");

CREATE UNIQUE INDEX "employees_active_tenantId_nationalId_key"
  ON "employees"("tenantId", "nationalId") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "employees_active_tenantId_registrationNumber_key"
  ON "employees"("tenantId", "registrationNumber") WHERE "deletedAt" IS NULL;
