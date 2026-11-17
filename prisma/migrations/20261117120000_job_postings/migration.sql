CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "JobEmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');

CREATE TABLE "JobPosting" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "employmentType" "JobEmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "summary" VARCHAR(280) NOT NULL,
    "description" TEXT NOT NULL,
    "aboutRole" TEXT,
    "responsibilities" TEXT[] NOT NULL,
    "requirements" TEXT[] NOT NULL,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobPosting_slug_key" ON "JobPosting"("slug");
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");
CREATE INDEX "JobPosting_department_employmentType_status_idx" ON "JobPosting"("department", "employmentType", "status");
CREATE INDEX "JobPosting_expiresAt_idx" ON "JobPosting"("expiresAt");

ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
