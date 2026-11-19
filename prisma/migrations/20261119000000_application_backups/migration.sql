CREATE TABLE "BackupArchive" (
    "id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "kind" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "recordCount" INTEGER,
    "fileCount" INTEGER,
    "checksum" TEXT,
    "triggeredBy" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "BackupArchive_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BackupArchive_objectKey_key" ON "BackupArchive"("objectKey");
CREATE INDEX "BackupArchive_createdAt_idx" ON "BackupArchive"("createdAt");
CREATE TABLE "BackupSchedule" (
    "id" TEXT NOT NULL DEFAULT 'company',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "timeUtc" TEXT NOT NULL DEFAULT '02:00',
    "retention" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackupSchedule_pkey" PRIMARY KEY ("id")
);
