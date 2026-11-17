ALTER TABLE "TaskComment" ALTER COLUMN "authorId" TYPE uuid USING "authorId"::uuid;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "TaskComment_authorId_createdAt_idx" ON "TaskComment"("authorId", "createdAt");
