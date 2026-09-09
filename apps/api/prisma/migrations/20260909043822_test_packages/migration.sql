-- CreateTable
CREATE TABLE "test_packages" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "vatRate" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "test_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_package_items" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "test_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "test_packages_tenantId_isActive_idx" ON "test_packages"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "test_packages_tenantId_code_idx" ON "test_packages"("tenantId", "code");

-- CreateIndex
CREATE INDEX "test_package_items_testId_idx" ON "test_package_items"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "test_package_items_packageId_testId_key" ON "test_package_items"("packageId", "testId");

-- AddForeignKey
ALTER TABLE "test_packages" ADD CONSTRAINT "test_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_items" ADD CONSTRAINT "test_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "test_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_package_items" ADD CONSTRAINT "test_package_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Package codes are unique per tenant among live rows only.
CREATE UNIQUE INDEX "test_packages_tenantId_code_active_key" ON "test_packages" ("tenantId", "code") WHERE "deletedAt" IS NULL;
