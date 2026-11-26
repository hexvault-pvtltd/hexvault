BEGIN;

SELECT pg_advisory_xact_lock(hashtext('employee-number-allocation'));
LOCK TABLE "Employee" IN SHARE ROW EXCLUSIVE MODE;

-- Preserve every prefix and never truncate numbers already four digits or longer.
CREATE TEMP TABLE employee_number_changes ON COMMIT DROP AS
SELECT "id", "employeeCode" AS old_code,
  CASE WHEN length(substring("employeeCode" from '([0-9]+)$')) BETWEEN 1 AND 3
    THEN regexp_replace("employeeCode", '[0-9]+$', '') || lpad(substring("employeeCode" from '([0-9]+)$'), 4, '0')
    ELSE "employeeCode"
  END AS new_code
FROM "Employee";

DO $$
BEGIN
  IF EXISTS (SELECT new_code FROM employee_number_changes GROUP BY new_code HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Employee number padding would create duplicate numbers. Resolve conflicting employee codes before retrying this migration.';
  END IF;
  IF EXISTS (SELECT 1 FROM employee_number_changes WHERE length(new_code) > 32 AND new_code <> old_code) THEN
    RAISE EXCEPTION 'A padded employee number would exceed 32 characters. Shorten its prefix before retrying this migration.';
  END IF;
END $$;

UPDATE "Employee" AS employee SET "employeeCode" = changes.new_code
FROM employee_number_changes AS changes
WHERE employee."id" = changes."id" AND changes.old_code <> changes.new_code;

INSERT INTO "EmployeeHistory" ("id", "employeeId", "eventType", "oldData", "newData", "actorId", "createdAt")
SELECT gen_random_uuid(), "id", 'EMPLOYEE_NUMBER_UPDATED',
  jsonb_build_object('employeeCode', old_code), jsonb_build_object('employeeCode', new_code),
  'system:pad-employee-numbers', CURRENT_TIMESTAMP
FROM employee_number_changes WHERE old_code <> new_code;

COMMIT;
