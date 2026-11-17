ALTER TABLE "ProjectMembership" ADD COLUMN "projectRole" TEXT NOT NULL DEFAULT 'MEMBER';
DROP INDEX "ProjectMembership_projectId_employeeId_key";
CREATE INDEX "ProjectMembership_projectId_leftAt_idx" ON "ProjectMembership"("projectId", "leftAt");
CREATE UNIQUE INDEX "ProjectMembership_one_active_member_idx"
ON "ProjectMembership" ("projectId", "employeeId")
WHERE "leftAt" IS NULL;
