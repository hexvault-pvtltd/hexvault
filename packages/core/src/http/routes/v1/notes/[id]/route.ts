import { currentUser } from "@core/lib/auth";
import { getOwnerNote, ManagementNoteError, updateOwnerNote } from "@core/features/management-notes/service";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  category: z.string().trim().min(2).max(60).optional(),
  content: z.string().trim().min(1).max(5000).optional(),
  followUpAt: z.string().datetime().nullable().optional(),
}).strict().refine(input => Object.keys(input).length > 0, "Provide at least one field to update.");

function noteError(error: unknown) {
  return error instanceof ManagementNoteError
    ? NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status })
    : fail(error);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    return ok(await getOwnerNote(id, actor.id));
  } catch (error) { return noteError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    return ok(await updateOwnerNote(id, actor.id, input));
  } catch (error) { return noteError(error); }
}
