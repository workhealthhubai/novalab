-- CreateEnum
CREATE TYPE "PneumoconiosisResult" AS ENUM ('NEGATIVE', 'BORDERLINE', 'POSITIVE');

-- CreateTable
CREATE TABLE "pneumoconiosis_readings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "protocolId" UUID,
    "radiologyRequestId" UUID,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readerId" UUID,
    "readerRole" TEXT,
    "filmDate" DATE,
    "filmQuality" INTEGER,
    "qualityComment" TEXT,
    "profusion" TEXT,
    "shapePrimary" TEXT,
    "shapeSecondary" TEXT,
    "zones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "largeOpacity" TEXT NOT NULL DEFAULT '0',
    "pleuralPlaques" BOOLEAN NOT NULL DEFAULT false,
    "plaqueCalcification" BOOLEAN NOT NULL DEFAULT false,
    "diffuseThickening" BOOLEAN NOT NULL DEFAULT false,
    "costophrenicObliteration" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "symbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "result" "PneumoconiosisResult" NOT NULL DEFAULT 'NEGATIVE',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pneumoconiosis_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pneumoconiosis_readings_tenantId_employeeId_readAt_idx" ON "pneumoconiosis_readings"("tenantId", "employeeId", "readAt");

-- CreateIndex
CREATE INDEX "pneumoconiosis_readings_tenantId_readAt_idx" ON "pneumoconiosis_readings"("tenantId", "readAt");

-- AddForeignKey
ALTER TABLE "pneumoconiosis_readings" ADD CONSTRAINT "pneumoconiosis_readings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneumoconiosis_readings" ADD CONSTRAINT "pneumoconiosis_readings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneumoconiosis_readings" ADD CONSTRAINT "pneumoconiosis_readings_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneumoconiosis_readings" ADD CONSTRAINT "pneumoconiosis_readings_radiologyRequestId_fkey" FOREIGN KEY ("radiologyRequestId") REFERENCES "radiology_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneumoconiosis_readings" ADD CONSTRAINT "pneumoconiosis_readings_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

