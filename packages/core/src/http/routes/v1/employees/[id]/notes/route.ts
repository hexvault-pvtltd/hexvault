import { currentUser } from "@core/lib/auth";
import { ManagementNoteError, createOwnerNote, listOwnerNotes } from "@core/features/management-notes/service";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const noteSchema = z.object({
  category: z.string().trim().min(2).max(60),
  content: z.string().trim().min(1).max(5000),
  followUpAt: z.string().datetime().nullable().optional(),
}).strict();

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
    return ok({ items: await listOwnerNotes(id, actor.id) });
  } catch (error) { return noteError(error); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  try {
    const { id } = await params;
    const input = noteSchema.parse(await request.json());
    return ok(await createOwnerNote(id, actor.id, input), 201);
  } catch (error) { return noteError(error); }
}
