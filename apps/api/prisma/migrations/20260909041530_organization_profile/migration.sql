-- CreateTable
CREATE TABLE "organization_profiles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "legalName" TEXT,
    "taxOffice" TEXT,
    "taxNumber" TEXT,
    "sgkRegistrationNumber" TEXT,
    "authorizationNumber" TEXT,
    "authorizationDate" DATE,
    "responsibleManager" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "website" TEXT,
    "addressProvinceId" INTEGER,
    "addressDistrictId" INTEGER,
    "addressLine" TEXT,
    "reportFooter" TEXT,
    "logoKey" TEXT,
    "logoUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_profiles_tenantId_key" ON "organization_profiles"("tenantId");

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_addressProvinceId_fkey" FOREIGN KEY ("addressProvinceId") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_addressDistrictId_fkey" FOREIGN KEY ("addressDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

