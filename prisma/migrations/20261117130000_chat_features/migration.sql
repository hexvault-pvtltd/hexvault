-- Add richer chat features without rewriting or deleting existing conversations.
CREATE TYPE "ChatConversationKind" AS ENUM ('DIRECT', 'GROUP');
CREATE TYPE "ChatVoiceCallStatus" AS ENUM ('ACTIVE', 'ENDED');
CREATE TYPE "ChatVoiceSignalType" AS ENUM ('OFFER', 'ANSWER', 'CANDIDATE', 'HANGUP');

ALTER TABLE "ChatConversation"
  ALTER COLUMN "directKey" DROP NOT NULL,
  ADD COLUMN "kind" "ChatConversationKind" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "name" TEXT,
  ADD COLUMN "description" VARCHAR(500),
  ADD COLUMN "createdBy" UUID;
ALTER TABLE "ChatMembership" ADD COLUMN "leftAt" TIMESTAMP(3);
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatMessage"
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pinnedAt" TIMESTAMP(3),
  ADD COLUMN "pinnedBy" UUID;

CREATE TABLE "ChatAttachment" (
  "id" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "fileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatReaction" (
  "id" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "emoji" VARCHAR(16) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatEvent" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatVoiceCall" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "startedBy" UUID NOT NULL,
  "status" "ChatVoiceCallStatus" NOT NULL DEFAULT 'ACTIVE',
  "activeConversationId" UUID,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "ChatVoiceCall_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatVoiceParticipant" (
  "id" UUID NOT NULL,
  "callId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "ChatVoiceParticipant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChatVoiceSignal" (
  "id" UUID NOT NULL,
  "callId" UUID NOT NULL,
  "fromUserId" UUID NOT NULL,
  "toUserId" UUID NOT NULL,
  "type" "ChatVoiceSignalType" NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatVoiceSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatAttachment_fileId_key" ON "ChatAttachment"("fileId");
CREATE INDEX "ChatAttachment_messageId_createdAt_idx" ON "ChatAttachment"("messageId", "createdAt");
CREATE UNIQUE INDEX "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");
CREATE INDEX "ChatReaction_messageId_createdAt_idx" ON "ChatReaction"("messageId", "createdAt");
CREATE INDEX "ChatEvent_conversationId_createdAt_id_idx" ON "ChatEvent"("conversationId", "createdAt", "id");
CREATE INDEX "ChatVoiceCall_conversationId_status_startedAt_idx" ON "ChatVoiceCall"("conversationId", "status", "startedAt");
CREATE UNIQUE INDEX "ChatVoiceCall_activeConversationId_key" ON "ChatVoiceCall"("activeConversationId");
CREATE UNIQUE INDEX "ChatVoiceParticipant_callId_userId_key" ON "ChatVoiceParticipant"("callId", "userId");
CREATE INDEX "ChatVoiceParticipant_callId_leftAt_idx" ON "ChatVoiceParticipant"("callId", "leftAt");
CREATE INDEX "ChatVoiceSignal_callId_toUserId_createdAt_idx" ON "ChatVoiceSignal"("callId", "toUserId", "createdAt");

ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatEvent" ADD CONSTRAINT "ChatEvent_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceCall" ADD CONSTRAINT "ChatVoiceCall_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceCall" ADD CONSTRAINT "ChatVoiceCall_startedBy_fkey"
  FOREIGN KEY ("startedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceParticipant" ADD CONSTRAINT "ChatVoiceParticipant_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "ChatVoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceParticipant" ADD CONSTRAINT "ChatVoiceParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatVoiceSignal" ADD CONSTRAINT "ChatVoiceSignal_callId_fkey"
  FOREIGN KEY ("callId") REFERENCES "ChatVoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
