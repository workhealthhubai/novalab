CREATE TABLE "operation_records" (
  "id" UUID NOT NULL, "tenantId" UUID NOT NULL, "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL, "date" DATE NOT NULL, "status" TEXT NOT NULL,
  "fields" JSONB NOT NULL, "amountCents" INTEGER, "protocolId" UUID,
  "version" INTEGER NOT NULL DEFAULT 1, "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "operation_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operation_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "operation_records_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "operation_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "operation_records_amount_check" CHECK ("amountCents" IS NULL OR "amountCents" > 0)
);
CREATE INDEX "operation_records_tenantId_kind_date_idx" ON "operation_records"("tenantId", "kind", "date");
CREATE UNIQUE INDEX "operation_records_tenantId_kind_protocolId_key" ON "operation_records"("tenantId", "kind", "protocolId");
