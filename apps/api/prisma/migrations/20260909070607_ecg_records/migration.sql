-- CreateEnum
CREATE TYPE "EcgRhythm" AS ENUM ('SINUS', 'SINUS_ARRHYTHMIA', 'SINUS_BRADYCARDIA', 'SINUS_TACHYCARDIA', 'ATRIAL_FIBRILLATION', 'ATRIAL_FLUTTER', 'SUPRAVENTRICULAR_TACHYCARDIA', 'PACED', 'OTHER');

-- CreateEnum
CREATE TYPE "EcgInterpretation" AS ENUM ('NORMAL', 'BORDERLINE', 'ABNORMAL');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'ECG_TRACE';

-- CreateTable
CREATE TABLE "ecg_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "protocolId" UUID,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" UUID,
    "deviceName" TEXT,
    "heartRate" INTEGER,
    "rhythm" "EcgRhythm",
    "prInterval" INTEGER,
    "qrsDuration" INTEGER,
    "qtInterval" INTEGER,
    "qtcInterval" INTEGER,
    "axis" INTEGER,
    "findings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interpretation" "EcgInterpretation" NOT NULL DEFAULT 'NORMAL',
    "comment" TEXT,
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ecg_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ecg_records_documentId_key" ON "ecg_records"("documentId");

-- CreateIndex
CREATE INDEX "ecg_records_tenantId_employeeId_performedAt_idx" ON "ecg_records"("tenantId", "employeeId", "performedAt");

-- CreateIndex
CREATE INDEX "ecg_records_tenantId_performedAt_idx" ON "ecg_records"("tenantId", "performedAt");

-- AddForeignKey
ALTER TABLE "ecg_records" ADD CONSTRAINT "ecg_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecg_records" ADD CONSTRAINT "ecg_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecg_records" ADD CONSTRAINT "ecg_records_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecg_records" ADD CONSTRAINT "ecg_records_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecg_records" ADD CONSTRAINT "ecg_records_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

