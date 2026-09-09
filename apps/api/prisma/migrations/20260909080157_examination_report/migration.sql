-- AlterTable
ALTER TABLE "examinations" ADD COLUMN     "anamnesis" JSONB,
ADD COLUMN     "physicianProfileId" UUID,
ADD COLUMN     "reportDocumentId" UUID,
ADD COLUMN     "systemsExam" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "examinations_reportDocumentId_key" ON "examinations"("reportDocumentId");

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_physicianProfileId_fkey" FOREIGN KEY ("physicianProfileId") REFERENCES "physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examinations" ADD CONSTRAINT "examinations_reportDocumentId_fkey" FOREIGN KEY ("reportDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

