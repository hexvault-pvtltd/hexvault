CREATE TYPE "JobApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED');

CREATE TABLE "JobApplication" (
    "id" UUID NOT NULL,
    "jobPostingId" UUID NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(40),
    "location" VARCHAR(120),
    "portfolioUrl" VARCHAR(500),
    "linkedInUrl" VARCHAR(500),
    "coverLetter" TEXT NOT NULL,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobApplication_jobPostingId_status_createdAt_idx" ON "JobApplication"("jobPostingId", "status", "createdAt");
CREATE INDEX "JobApplication_status_createdAt_idx" ON "JobApplication"("status", "createdAt");
CREATE INDEX "JobApplication_email_idx" ON "JobApplication"("email");

ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
