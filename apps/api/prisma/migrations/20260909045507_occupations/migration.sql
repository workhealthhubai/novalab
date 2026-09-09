-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "occupationId" UUID;

-- CreateTable
CREATE TABLE "occupations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "occupations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "occupations_tenantId_isActive_name_idx" ON "occupations"("tenantId", "isActive", "name");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "occupations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupations" ADD CONSTRAINT "occupations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Names (and codes, when set) are unique per tenant among live rows only.
CREATE UNIQUE INDEX "occupations_tenantId_name_active_key" ON "occupations" ("tenantId", lower("name")) WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "occupations_tenantId_code_active_key" ON "occupations" ("tenantId", "code") WHERE "deletedAt" IS NULL AND "code" IS NOT NULL;
