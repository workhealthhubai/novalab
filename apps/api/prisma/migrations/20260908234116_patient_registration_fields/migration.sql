-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'FAILED', 'MANUAL');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "addressDistrictId" INTEGER,
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "addressNeighborhoodId" INTEGER,
ADD COLUMN     "addressProvinceId" INTEGER,
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "homePhone" TEXT,
ADD COLUMN     "identityVerificationSource" TEXT,
ADD COLUMN     "identityVerificationStatus" "IdentityVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender";

-- CreateTable
CREATE TABLE "provinces" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" INTEGER NOT NULL,
    "provinceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neighborhoods" (
    "id" INTEGER NOT NULL,
    "districtId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "districts_provinceId_idx" ON "districts"("provinceId");

-- CreateIndex
CREATE INDEX "neighborhoods_districtId_idx" ON "neighborhoods"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_registrationNumber_key" ON "employees"("tenantId", "registrationNumber");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_addressProvinceId_fkey" FOREIGN KEY ("addressProvinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_addressDistrictId_fkey" FOREIGN KEY ("addressDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_addressNeighborhoodId_fkey" FOREIGN KEY ("addressNeighborhoodId") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neighborhoods" ADD CONSTRAINT "neighborhoods_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

