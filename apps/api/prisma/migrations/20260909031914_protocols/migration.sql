-- CreateEnum
CREATE TYPE "ProtocolStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProtocolItemType" AS ENUM ('RADIOLOGY', 'AUDIOMETRY', 'ECG', 'SPIROMETRY', 'EYE', 'PNEUMOCONIOSIS', 'LAB', 'HEALTH_REPORT', 'ISG_REPORT');

-- CreateEnum
CREATE TYPE "ProtocolItemStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');

-- AlterTable
ALTER TABLE "examinations" ADD COLUMN     "protocolId" UUID;

-- CreateTable
CREATE TABLE "protocols" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "protocolNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "employeeId" UUID NOT NULL,
    "companyId" UUID,
    "type" "ExaminationType" NOT NULL,
    "status" "ProtocolStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openedById" UUID NOT NULL,
    "closedById" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "protocolId" UUID NOT NULL,
    "type" "ProtocolItemType" NOT NULL,
    "status" "ProtocolItemStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocol_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protocol_counters" (
    "tenantId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "protocol_counters_pkey" PRIMARY KEY ("tenantId","year")
);

-- CreateIndex
CREATE INDEX "protocols_tenantId_status_idx" ON "protocols"("tenantId", "status");

-- CreateIndex
CREATE INDEX "protocols_tenantId_employeeId_idx" ON "protocols"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "protocols_tenantId_openedAt_idx" ON "protocols"("tenantId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "protocols_tenantId_protocolNumber_key" ON "protocols"("tenantId", "protocolNumber");

-- CreateIndex
CREATE INDEX "protocol_items_tenantId_type_status_idx" ON "protocol_items"("tenantId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "protocol_items_protocolId_type_key" ON "protocol_items"("protocolId", "type");

-- CreateIndex
CREATE INDEX "examinations_tenantId_protocolId_idx" ON "examinations"("tenantId", "protocolId");

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_items" ADD CONSTRAINT "protocol_items_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE CASCADE ON UPDATE CASCADE;

