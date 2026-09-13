ALTER TABLE "documents" ADD COLUMN "expiresAt" DATE;
CREATE INDEX "documents_tenantId_expiresAt_idx" ON "documents"("tenantId", "expiresAt");
