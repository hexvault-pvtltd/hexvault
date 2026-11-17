CREATE UNIQUE INDEX "TaskAssignee_one_active_assignment_idx"
ON "TaskAssignee" ("taskId", "employeeId")
WHERE "unassignedAt" IS NULL;
