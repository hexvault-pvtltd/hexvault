-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "onboarding_one_active_per_employee" ON "OnboardingCase" ("employeeId") WHERE "status" IN ('OPEN', 'IN_PROGRESS');
CREATE UNIQUE INDEX "offboarding_one_active_per_employee" ON "OffboardingCase" ("employeeId") WHERE "status" IN ('OPEN', 'IN_PROGRESS');
