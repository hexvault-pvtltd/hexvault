BEGIN;
LOCK TABLE "EmploymentCertificate" IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE "EmploymentCertificate" ADD COLUMN "verificationAlias" TEXT;
CREATE UNIQUE INDEX "EmploymentCertificate_verificationAlias_key" ON "EmploymentCertificate"("verificationAlias");

-- The DOB hashes are bound to the original ID. Retain it as a private alias
-- so existing verification links and DOB hashes keep working after renumbering.
CREATE TEMP TABLE certificate_id_changes ON COMMIT DROP AS
WITH originals AS (
  SELECT certificate."id", certificate."certificateId" AS old_id, certificate."employeeId",
    certificate."issuedAt",
    'HV-' || CASE WHEN certificate."kind" = 'INTERNSHIP' THEN 'INTERN' ELSE certificate."kind" END ||
      '-' || EXTRACT(YEAR FROM certificate."employmentEnd")::text || '-' AS prefix,
    substring(employee."employeeCode" from '([0-9]+)$') AS employee_number
  FROM "EmploymentCertificate" certificate JOIN "Employee" employee ON employee."id" = certificate."employeeId"
  WHERE certificate."certificateId" ~ '^HV-[A-F0-9]{32}$'
), numbered AS (
  SELECT *, COALESCE(employee_number,
    (COALESCE(MAX(employee_number::numeric) OVER (PARTITION BY prefix), 0) + ROW_NUMBER() OVER (PARTITION BY prefix ORDER BY "issuedAt", "id"))::text) AS number
  FROM originals
), bases AS (
  SELECT *, prefix || lpad(number, GREATEST(4, length(number)), '0') AS base_id FROM numbered
), revisions AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY base_id ORDER BY "issuedAt", "id") AS revision FROM bases
)
SELECT "id", "employeeId", old_id,
  base_id || CASE WHEN revision = 1 THEN '' ELSE '-' || lpad(revision::text, GREATEST(2, length(revision::text)), '0') END AS new_id
FROM revisions;

DO $$
BEGIN
  IF EXISTS (
    SELECT COALESCE(changes.new_id, certificate."certificateId")
    FROM "EmploymentCertificate" certificate LEFT JOIN certificate_id_changes changes ON changes."id" = certificate."id"
    GROUP BY COALESCE(changes.new_id, certificate."certificateId") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Readable certificate IDs would collide with an existing certificate. Resolve the conflicting ID before retrying.';
  END IF;
END $$;

UPDATE "EmploymentCertificate" certificate
SET "certificateId" = changes.new_id, "verificationAlias" = changes.old_id
FROM certificate_id_changes changes WHERE certificate."id" = changes."id";

INSERT INTO "EmployeeHistory" ("id", "employeeId", "eventType", "oldData", "newData", "actorId", "createdAt")
SELECT gen_random_uuid(), "employeeId", 'CERTIFICATE_ID_UPDATED',
  jsonb_build_object('certificateId', old_id), jsonb_build_object('certificateId', new_id),
  'system:readable-certificate-ids', CURRENT_TIMESTAMP
FROM certificate_id_changes;
COMMIT;
