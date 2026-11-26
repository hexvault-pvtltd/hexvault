ALTER TABLE "EmploymentCertificate" ADD COLUMN "fileId" UUID;
ALTER TABLE "EmploymentCertificate" ADD CONSTRAINT "EmploymentCertificate_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EmploymentCertificate_fileId_idx" ON "EmploymentCertificate"("fileId");
