-- CreateTable
CREATE TABLE "audiometry_tests" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "protocolId" UUID,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" UUID,
    "deviceName" TEXT,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "quietHours" INTEGER,
    "airRight" JSONB NOT NULL,
    "airLeft" JSONB NOT NULL,
    "boneRight" JSONB,
    "boneLeft" JSONB,
    "ptaRight" DECIMAL(5,1),
    "ptaLeft" DECIMAL(5,1),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "audiometry_tests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audiometry_tests_tenantId_employeeId_performedAt_idx" ON "audiometry_tests"("tenantId", "employeeId", "performedAt");

-- CreateIndex
CREATE INDEX "audiometry_tests_tenantId_performedAt_idx" ON "audiometry_tests"("tenantId", "performedAt");

-- AddForeignKey
ALTER TABLE "audiometry_tests" ADD CONSTRAINT "audiometry_tests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiometry_tests" ADD CONSTRAINT "audiometry_tests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiometry_tests" ADD CONSTRAINT "audiometry_tests_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiometry_tests" ADD CONSTRAINT "audiometry_tests_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

