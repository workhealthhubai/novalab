-- Track bounded, delayed retries for DICOM Modality Worklist publication.
ALTER TABLE "radiology_requests"
ADD COLUMN "worklistAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "worklistNextAttemptAt" TIMESTAMP(3),
ADD COLUMN "worklistLastError" TEXT;

CREATE INDEX "radiology_requests_tenantId_worklistStatus_worklistNextAttemptAt_idx"
ON "radiology_requests"("tenantId", "worklistStatus", "worklistNextAttemptAt");

-- Durable in-app notifications (sourceKey prevents duplicate scheduled reminders).
CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "recipientUserId" UUID,
  "sourceKey" TEXT,
  "template" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_sourceKey_key" ON "notifications"("sourceKey");
CREATE INDEX "notifications_tenantId_recipientUserId_readAt_createdAt_idx"
ON "notifications"("tenantId", "recipientUserId", "readAt", "createdAt");

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents" ADD COLUMN "thumbnailKey" TEXT;
CREATE INDEX "documents_tenantId_deletedAt_idx" ON "documents"("tenantId", "deletedAt");
