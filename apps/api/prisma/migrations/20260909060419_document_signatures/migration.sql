-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'SIGNED_FORM';

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "consentId" UUID,
    "title" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" UUID,
    "signatureKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_signatures_documentId_key" ON "document_signatures"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_signatures_consentId_key" ON "document_signatures"("consentId");

-- CreateIndex
CREATE INDEX "document_signatures_tenantId_employeeId_idx" ON "document_signatures"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "document_signatures_tenantId_signedAt_idx" ON "document_signatures"("tenantId", "signedAt");

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "patient_consents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

