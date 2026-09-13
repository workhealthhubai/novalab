-- DICOM MWL configuration per tenant and deterministic order/study correlation.
CREATE TYPE "RadiologyWorklistStatus" AS ENUM (
  'NOT_CONFIGURED',
  'PENDING',
  'PUBLISHED',
  'FAILED',
  'REMOVED'
);

ALTER TABLE "organization_profiles"
  ADD COLUMN "radiologyStationAet" TEXT;

ALTER TABLE "radiology_requests"
  ADD COLUMN "accessionNumber" TEXT,
  ADD COLUMN "worklistId" TEXT,
  ADD COLUMN "worklistStatus" "RadiologyWorklistStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN "worklistSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "radiology_requests_accessionNumber_key"
  ON "radiology_requests"("accessionNumber");
