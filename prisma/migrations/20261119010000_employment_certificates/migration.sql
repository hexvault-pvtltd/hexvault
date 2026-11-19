CREATE TABLE "EmploymentCertificate" (
  "id" UUID NOT NULL,
  "certificateId" TEXT NOT NULL,
  "employeeId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "employmentStart" DATE NOT NULL,
  "employmentEnd" DATE NOT NULL,
  "dobHash" TEXT NOT NULL,
  "issuedBy" UUID NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokedBy" UUID,
  CONSTRAINT "EmploymentCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmploymentCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmploymentCertificate_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OffboardingCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EmploymentCertificate_certificateId_key" ON "EmploymentCertificate"("certificateId");
CREATE INDEX "EmploymentCertificate_employeeId_issuedAt_idx" ON "EmploymentCertificate"("employeeId", "issuedAt");
CREATE INDEX "EmploymentCertificate_caseId_issuedAt_idx" ON "EmploymentCertificate"("caseId", "issuedAt");
CREATE TABLE "CertificateVerificationLimit" (
  "id" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CertificateVerificationLimit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateVerificationLimit_expiresAt_idx" ON "CertificateVerificationLimit"("expiresAt");
