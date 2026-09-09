-- CreateEnum
CREATE TYPE "PhysicianStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "physicians" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "specialty" TEXT,
    "diplomaNumber" TEXT,
    "diplomaRegistrationNumber" TEXT,
    "certificateNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "signatureKey" TEXT,
    "signatureUpdatedAt" TIMESTAMP(3),
    "status" "PhysicianStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "physicians_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "physicians_userId_key" ON "physicians"("userId");

-- CreateIndex
CREATE INDEX "physicians_tenantId_status_idx" ON "physicians"("tenantId", "status");

-- CreateIndex
CREATE INDEX "physicians_tenantId_lastName_firstName_idx" ON "physicians"("tenantId", "lastName", "firstName");

-- AddForeignKey
ALTER TABLE "physicians" ADD CONSTRAINT "physicians_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physicians" ADD CONSTRAINT "physicians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

