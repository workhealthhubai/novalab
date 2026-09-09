-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DISCLOSURE', 'EXPLICIT_CONSENT', 'HEALTH_DATA', 'COMMUNICATION');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GIVEN', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('PAPER', 'SIGNATURE_PAD', 'ELECTRONIC', 'VERBAL');

-- CreateTable
CREATE TABLE "consent_templates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GIVEN',
    "method" "ConsentMethod" NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawReason" TEXT,
    "collectedById" UUID,
    "documentId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_templates_tenantId_type_isActive_idx" ON "consent_templates"("tenantId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "consent_templates_tenantId_type_version_key" ON "consent_templates"("tenantId", "type", "version");

-- CreateIndex
CREATE INDEX "patient_consents_tenantId_employeeId_idx" ON "patient_consents"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "patient_consents_tenantId_status_idx" ON "patient_consents"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "consent_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

