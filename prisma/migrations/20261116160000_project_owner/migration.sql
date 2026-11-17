ALTER TABLE "Project" ADD COLUMN "ownerEmployeeId" UUID;
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Project_ownerEmployeeId_idx" ON "Project"("ownerEmployeeId");
