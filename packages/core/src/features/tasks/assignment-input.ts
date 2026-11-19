import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().max(4000).optional(),
  projectId: z.string().uuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.coerce.date().optional(),
  assigneeIds: z.array(z.string().uuid()).max(500).default([]),
  teamId: z.string().uuid().optional(),
  assignWholeTeam: z.boolean().default(false),
}).strict().superRefine((input, context) => {
  if (new Set(input.assigneeIds).size !== input.assigneeIds.length) context.addIssue({ code: "custom", path: ["assigneeIds"], message: "Assignees must be unique." });
  if (input.assignWholeTeam && !input.teamId) context.addIssue({ code: "custom", path: ["teamId"], message: "Choose a team." });
  if (input.assignWholeTeam && input.assigneeIds.length) context.addIssue({ code: "custom", path: ["assigneeIds"], message: "Choose either a whole team or specific members." });
  if (input.teamId && !input.assignWholeTeam && !input.assigneeIds.length) context.addIssue({ code: "custom", path: ["assigneeIds"], message: "Choose a member of the selected team." });
});

export class TaskAssignmentError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function resolveTaskAssignees(input: { teamId?: string; assignWholeTeam: boolean; assigneeIds: string[] }, teamMemberIds: string[] | null, allowedIds: string[] | null): string[] {
  if (input.teamId && teamMemberIds === null) throw new TaskAssignmentError(404, "NOT_FOUND", "Active team not found.");
  const ids = input.assignWholeTeam ? [...new Set(teamMemberIds ?? [])] : input.assigneeIds;
  if (input.assignWholeTeam && !ids.length) throw new TaskAssignmentError(409, "CONFLICT", "This team has no active members to assign.");
  if (input.teamId && ids.some(id => !teamMemberIds?.includes(id))) throw new TaskAssignmentError(422, "VALIDATION_ERROR", "Select active members of the chosen team.");
  if (ids.length > 500) throw new TaskAssignmentError(422, "VALIDATION_ERROR", "A task can have at most 500 assignees.");
  if (allowedIds !== null && ids.some(id => !allowedIds.includes(id))) throw new TaskAssignmentError(403, "FORBIDDEN", "One or more assignees are outside your scope. Choose members you can assign.");
  return ids;
}
