import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { TaskAssignmentError } from "@core/features/tasks/assignment-input";
import { activeTeamPeople, assignmentTeamSelect, taskCreationScope } from "@core/features/tasks/creation-scope";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentUser();
    if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
    const { projectId } = z.object({ projectId: z.string().uuid().optional() }).strict().parse(Object.fromEntries(request.nextUrl.searchParams));
    const scope = await taskCreationScope(actor, projectId);
    const teams = await db.team.findMany({ where: { active: true, ...(scope === null ? {} : { OR: [{ leadEmployeeId: { in: scope } }, { memberships: { some: { employeeId: { in: scope }, endedAt: null } } }] }) }, select: assignmentTeamSelect, orderBy: [{ department: { name: "asc" } }, { name: "asc" }] });
    const items = teams.map(team => {
      const all = activeTeamPeople(team);
      return { id: team.id, name: team.name, department: team.department.name, members: all.filter(person => scope === null || scope.includes(person.id)), canAssignWholeTeam: all.length > 0 && (scope === null || all.every(person => scope.includes(person.id))) };
    }).filter(team => scope === null || team.members.length > 0);
    return ok({ items });
  } catch (error) {
    if (error instanceof TaskAssignmentError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    return fail(error);
  }
}
