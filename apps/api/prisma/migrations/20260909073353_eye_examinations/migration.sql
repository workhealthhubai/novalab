-- CreateEnum
CREATE TYPE "ColorVisionResult" AS ENUM ('NORMAL', 'DEFICIENT', 'NOT_TESTED');

-- CreateEnum
CREATE TYPE "VisualFieldResult" AS ENUM ('NORMAL', 'ABNORMAL', 'NOT_TESTED');

-- CreateEnum
CREATE TYPE "EyeRecommendation" AS ENUM ('NONE', 'GLASSES', 'REFERRAL');

-- CreateTable
CREATE TABLE "eye_examinations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "protocolId" UUID,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" UUID,
    "usesGlasses" BOOLEAN NOT NULL DEFAULT false,
    "usesContactLenses" BOOLEAN NOT NULL DEFAULT false,
    "farRight" DECIMAL(3,2),
    "farLeft" DECIMAL(3,2),
    "farRightCorrected" DECIMAL(3,2),
    "farLeftCorrected" DECIMAL(3,2),
    "nearRight" INTEGER,
    "nearLeft" INTEGER,
    "ishiharaCorrect" INTEGER,
    "ishiharaTotal" INTEGER,
    "colorVision" "ColorVisionResult" NOT NULL DEFAULT 'NOT_TESTED',
    "visualField" "VisualFieldResult" NOT NULL DEFAULT 'NOT_TESTED',
    "findings" TEXT,
    "recommendation" "EyeRecommendation" NOT NULL DEFAULT 'NONE',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "eye_examinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eye_examinations_tenantId_employeeId_performedAt_idx" ON "eye_examinations"("tenantId", "employeeId", "performedAt");

-- CreateIndex
CREATE INDEX "eye_examinations_tenantId_performedAt_idx" ON "eye_examinations"("tenantId", "performedAt");

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "protocols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

