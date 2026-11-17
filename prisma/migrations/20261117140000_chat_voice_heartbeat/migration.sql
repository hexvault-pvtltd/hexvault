-- Track active call participation and allow stale voice sessions to expire safely.
ALTER TABLE "ChatVoiceParticipant"
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ChatVoiceParticipant_callId_lastSeenAt_idx"
  ON "ChatVoiceParticipant"("callId", "lastSeenAt");
