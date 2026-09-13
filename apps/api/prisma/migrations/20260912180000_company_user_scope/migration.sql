ALTER TABLE "users" ADD COLUMN "companyId" UUID;
CREATE UNIQUE INDEX "companies_tenantId_id_key" ON "companies"("tenantId", "id");
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_companyId_fkey" FOREIGN KEY ("tenantId", "companyId") REFERENCES "companies"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
