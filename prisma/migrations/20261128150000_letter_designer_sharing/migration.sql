ALTER TABLE "GeneratedLetter" ADD COLUMN "recipientPhone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "whatsappText" TEXT NOT NULL DEFAULT '', ADD COLUMN "layout" JSONB;
ALTER TABLE "LetterTemplate" ADD COLUMN "layout" JSONB,
  ADD COLUMN "whatsappText" TEXT NOT NULL DEFAULT '';
