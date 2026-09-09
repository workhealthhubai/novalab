-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('RADIOLOGY', 'AUDIOMETRY', 'ECG', 'SPIROMETRY', 'EYE', 'PNEUMOCONIOSIS', 'LAB', 'HEALTH_REPORT', 'ISG_REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "test_definitions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TestCategory" NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vatRate" INTEGER NOT NULL DEFAULT 20,
    "durationMinutes" INTEGER,
    "sampleType" TEXT,
    "referenceRange" TEXT,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "test_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_definitions_tenantId_category_isActive_idx" ON "test_definitions"("tenantId", "category", "isActive");

-- CreateIndex
CREATE INDEX "test_definitions_tenantId_code_idx" ON "test_definitions"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "test_definitions" ADD CONSTRAINT "test_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Codes are unique per tenant among live rows only, so a deleted test's code can be reused.
CREATE UNIQUE INDEX "test_definitions_tenantId_code_active_key" ON "test_definitions" ("tenantId", "code") WHERE "deletedAt" IS NULL;
