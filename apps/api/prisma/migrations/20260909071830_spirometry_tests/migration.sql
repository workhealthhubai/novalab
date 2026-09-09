-- CreateEnum
CREATE TYPE "SpirometryPattern" AS ENUM ('NORMAL', 'OBSTRUCTIVE', 'RESTRICTIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'SPIROMETRY_TRACE';

-- CreateTable
CREATE TABLE "spirometry_tests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "protocolId" UUID,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" UUID,
    "deviceName" TEXT,
    "heightCm" INTEGER,
    "weightKg" DECIMAL(5,1),
    "smokingStatus" "SmokingStatus",
    "fvc" DECIMAL(4,2),
    "fev1" DECIMAL(4,2),
    "ratio" DECIMAL(4,1),
    "pef" DECIMAL(4,2),
    "fef2575" DECIMAL(4,2),
    "fvcPredicted" DECIMAL(4,2),
    "fev1Predicted" DECIMAL(4,2),
    "postFvc" DECIMAL(4,2),
    "postFev1" DECIMAL(4,2),
    "qualityGrade" TEXT,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "pattern" "SpirometryPattern",
    "comment" TEXT,
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "spirometry_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spirometry_tests_documentId_key" ON "spirometry_tests"("documentId");

-- CreateIndex
CREATE INDEX "spirometry_tests_tenantId_employeeId_performedAt_idx" ON "spirometry_tests"("tenantId", "employeeId", "performedAt");

-- CreateIndex
CREATE INDEX "spirometry_tests_tenantId_performedAt_idx" ON "spirometry_tests"("tenantId", "performedAt");

-- AddForeignKey
ALTER TABLE "spirometry_tests" ADD CONSTRAINT "spirometry_tests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spirometry_tests" ADD CONSTRAINT "spirometry_tests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spirometry_tests" ADD CONSTRAINT "spirometry_tests_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spirometry_tests" ADD CONSTRAINT "spirometry_tests_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spirometry_tests" ADD CONSTRAINT "spirometry_tests_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

