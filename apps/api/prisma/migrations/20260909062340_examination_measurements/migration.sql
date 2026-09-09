-- CreateTable
CREATE TABLE "examination_measurements" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "examinationId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID,

    CONSTRAINT "examination_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "examination_measurements_tenantId_examinationId_idx" ON "examination_measurements"("tenantId", "examinationId");

-- CreateIndex
CREATE UNIQUE INDEX "examination_measurements_examinationId_key_key" ON "examination_measurements"("examinationId", "key");

-- AddForeignKey
ALTER TABLE "examination_measurements" ADD CONSTRAINT "examination_measurements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_measurements" ADD CONSTRAINT "examination_measurements_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "examinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examination_measurements" ADD CONSTRAINT "examination_measurements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

