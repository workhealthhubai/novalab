ALTER TABLE "examinations"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- At most one live report record can be opened for a protocol. PostgreSQL permits
-- multiple NULL protocol ids, preserving standalone examinations.
CREATE UNIQUE INDEX "examinations_active_tenantId_protocolId_key"
ON "examinations"("tenantId", "protocolId")
WHERE "deletedAt" IS NULL AND "protocolId" IS NOT NULL;
