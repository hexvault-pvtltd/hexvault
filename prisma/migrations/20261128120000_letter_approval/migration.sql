CREATE TABLE "GeneratedLetter" (
  "id" UUID NOT NULL, "title" TEXT NOT NULL, "companyName" TEXT NOT NULL,
  "recipientName" TEXT NOT NULL, "recipientEmail" TEXT NOT NULL,
  "documentDate" TEXT NOT NULL, "body" TEXT NOT NULL,
  "emailSubject" TEXT NOT NULL, "emailBody" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT', "revision" INTEGER NOT NULL DEFAULT 1,
  "createdBy" UUID NOT NULL, "approvedBy" UUID, "approvedAt" TIMESTAMP(3),
  "feedback" TEXT, "sentBy" UUID, "sentAt" TIMESTAMP(3), "deliveryMethod" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GeneratedLetter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GeneratedLetter_status_createdAt_idx" ON "GeneratedLetter"("status", "createdAt");
CREATE INDEX "GeneratedLetter_createdBy_createdAt_idx" ON "GeneratedLetter"("createdBy", "createdAt");
CREATE TABLE "LetterTemplate" (
  "id" UUID NOT NULL, "name" TEXT NOT NULL, "title" TEXT NOT NULL,
  "body" TEXT NOT NULL, "emailSubject" TEXT NOT NULL, "emailBody" TEXT NOT NULL,
  "createdBy" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LetterTemplate_pkey" PRIMARY KEY ("id")
);
