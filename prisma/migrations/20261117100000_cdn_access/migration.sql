CREATE TABLE "CdnFolder" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CdnFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CdnFolderGrant" (
    "id" UUID NOT NULL,
    "folderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canUpload" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CdnFolderGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CdnAsset" (
    "id" UUID NOT NULL,
    "folderId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CdnAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CdnFolder_name_key" ON "CdnFolder"("name");
CREATE INDEX "CdnFolder_active_name_idx" ON "CdnFolder"("active", "name");
CREATE UNIQUE INDEX "CdnFolderGrant_folderId_userId_key" ON "CdnFolderGrant"("folderId", "userId");
CREATE INDEX "CdnFolderGrant_userId_canView_idx" ON "CdnFolderGrant"("userId", "canView");
CREATE UNIQUE INDEX "CdnAsset_fileId_key" ON "CdnAsset"("fileId");
CREATE INDEX "CdnAsset_folderId_isPublic_createdAt_idx" ON "CdnAsset"("folderId", "isPublic", "createdAt");

ALTER TABLE "CdnFolderGrant" ADD CONSTRAINT "CdnFolderGrant_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CdnFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CdnFolderGrant" ADD CONSTRAINT "CdnFolderGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CdnAsset" ADD CONSTRAINT "CdnAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CdnFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CdnAsset" ADD CONSTRAINT "CdnAsset_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
