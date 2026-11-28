import type { Prisma } from "@prisma/client";
import { db } from "@core/lib/db";
import { visibleEmployeeIds } from "@core/lib/scope";

type Actor = Parameters<typeof visibleEmployeeIds>[0];
export const letterRecipientSelect = { id: true, employeeCode: true, fullName: true, workEmail: true, phone: true, title: true, lifecycleStatus: true } as const;
export function recipientFilter(ids: string[] | null, query: string, id?: string): Prisma.EmployeeWhereInput {
  return { AND: [ ...(ids === null ? [] : [{ id: { in: ids } }]), ...(id ? [{ id }] : []), ...(query ? [{ OR: [
    { fullName: { contains: query, mode: "insensitive" as const } }, { employeeCode: { contains: query, mode: "insensitive" as const } }, { workEmail: { contains: query, mode: "insensitive" as const } },
  ] }] : []) ] };
}
export async function findLetterRecipients(actor: Actor, query: string, id?: string, database = db) {
  return database.employee.findMany({ where: recipientFilter(await visibleEmployeeIds(actor), query, id), select: letterRecipientSelect, orderBy: { fullName: "asc" }, take: 30 });
}
