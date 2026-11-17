-- Forward-only, additive indexes for observed high-frequency relationship and history queries.
-- Prisma Migrate wraps this migration in a transaction, so PostgreSQL CONCURRENTLY is unsupported here.
-- pg_trgm indexes accelerate the app's case-insensitive substring search predicates.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS "Employee_fullName_idx" ON "Employee" USING GIN ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Employee_fullName_sort_idx" ON "Employee"("fullName");
CREATE INDEX IF NOT EXISTS "Employee_employeeCode_idx" ON "Employee" USING GIN ("employeeCode" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Employee_workEmail_idx" ON "Employee" USING GIN ("workEmail" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Task_title_idx" ON "Task" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Project_name_idx" ON "Project" USING GIN ("name" gin_trgm_ops);
-- Preserve employee correction history and prevent invalid scoped holiday/invitation links.
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "AttendanceCorrection" VALIDATE CONSTRAINT "AttendanceCorrection_employeeId_fkey";
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Holiday" VALIDATE CONSTRAINT "Holiday_departmentId_fkey";
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
ALTER TABLE "Invitation" VALIDATE CONSTRAINT "Invitation_employeeId_fkey";
CREATE INDEX IF NOT EXISTS "Invitation_employeeId_idx" ON "Invitation"("employeeId");
CREATE INDEX IF NOT EXISTS "UserRole_userId_revokedAt_idx" ON "UserRole"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "Department_headEmployeeId_idx" ON "Department"("headEmployeeId");
CREATE INDEX IF NOT EXISTS "Team_leadEmployeeId_active_idx" ON "Team"("leadEmployeeId", "active");
CREATE INDEX IF NOT EXISTS "TeamMembership_teamId_endedAt_idx" ON "TeamMembership"("teamId", "endedAt");
CREATE INDEX IF NOT EXISTS "AttendanceSession_workDate_idx" ON "AttendanceSession"("workDate");
CREATE INDEX IF NOT EXISTS "AttendanceBreak_sessionId_endedAt_idx" ON "AttendanceBreak"("sessionId", "endedAt");
CREATE INDEX IF NOT EXISTS "ProjectMembership_employeeId_leftAt_idx" ON "ProjectMembership"("employeeId", "leftAt");
CREATE INDEX IF NOT EXISTS "TaskStatusHistory_taskId_changedAt_idx" ON "TaskStatusHistory"("taskId", "changedAt");
CREATE INDEX IF NOT EXISTS "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "WorkLogTaskEntry_workLogId_idx" ON "WorkLogTaskEntry"("workLogId");
CREATE INDEX IF NOT EXISTS "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_visibility_idx" ON "EmployeeDocument"("employeeId", "visibility");
CREATE INDEX IF NOT EXISTS "Holiday_departmentId_idx" ON "Holiday"("departmentId");
CREATE INDEX IF NOT EXISTS "Holiday_date_departmentId_idx" ON "Holiday"("date", "departmentId");
