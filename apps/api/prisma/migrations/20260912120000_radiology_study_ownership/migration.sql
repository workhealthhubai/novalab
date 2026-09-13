-- One PACS study can belong to only one application request across all tenants.
-- PostgreSQL unique indexes allow multiple NULLs, so unlinked requests remain valid.
CREATE UNIQUE INDEX "radiology_requests_studyInstanceUid_key"
ON "radiology_requests"("studyInstanceUid");
