import type { Prisma } from "@prisma/client";
import { z } from "zod";

export function formatEmployeeNumber(value: string) {
  return value.replace(/\d+$/, digits => digits.padStart(4, "0"));
}

// Keep prefixes such as 2026- or OWN- and pad their numeric suffix to four digits.
export const employeeCodeSchema = z.string().trim().min(1).max(32)
  .transform(formatEmployeeNumber).pipe(z.string().max(32));

export async function lockEmployeeNumbers(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('employee-number-allocation'))`;
}

export async function nextEmployeeNumber(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<{ maximum: string }[]>`
    SELECT COALESCE(MAX("employeeCode"::numeric), 0)::text AS maximum
    FROM "Employee" WHERE "employeeCode" ~ '^[0-9]+$'
  `;
  return (BigInt(row.maximum) + BigInt(1)).toString().padStart(4, "0");
}
