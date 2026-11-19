import { db } from "@core/lib/db";

type Actor = { employee?: { id: string } | null } | null;
export async function personalGoals(actor: Actor, options: { limit?: number; activeOnly?: boolean } = {}, database = db) {
  // Personal pages never use management/department scope, even for an owner.
  if (!actor?.employee) return [];
  const take = Math.min(100, Math.max(1, Math.trunc(options.limit ?? 100)));
  return database.employeeGoal.findMany({
    where: { employeeId: actor.employee.id, ...(options.activeOnly ? { status: "ACTIVE" } : {}) },
    orderBy: [{ targetDate: "asc" }, { id: "asc" }], take,
  });
}
