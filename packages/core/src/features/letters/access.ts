import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { LetterError, type LetterActor } from "./policy";

export async function canPrepareLetters(actor: LetterActor & { employee?: { id: string } | null }) {
  if (actor.roles.some(role => ["OWNER", "HR", "DEPARTMENT_HEAD", "TEAM_LEAD"].includes(role))) return true;
  return Boolean(actor.employee && await db.project.findFirst({ where: { status: "ACTIVE", OR: [
    { ownerEmployeeId: actor.employee.id },
    { memberships: { some: { employeeId: actor.employee.id, leftAt: null, projectRole: { in: ["LEAD", "MANAGER", "PROJECT_MANAGER"] } } } },
  ] }, select: { id: true } }));
}

export async function letterActor() {
  const actor = await currentUser();
  if (!actor) throw new LetterError(401, "Sign in to continue.");
  if (await canPrepareLetters(actor)) return actor;
  throw new LetterError(403, "Only HR, management, and project managers can prepare letters.");
}
