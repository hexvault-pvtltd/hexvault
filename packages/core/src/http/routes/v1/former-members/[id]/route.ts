import { currentUser } from "@core/lib/auth";
import { FormerMemberAccessError, getFormerMember } from "@core/features/employees/former-members";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";


export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid former member identifier." } }, { status: 422 });
  try {
    return ok(await getFormerMember(actor, id));
  } catch (error) {
    if (error instanceof FormerMemberAccessError) return NextResponse.json({ error: { code: error.status === 403 ? "FORBIDDEN" : "NOT_FOUND", message: error.message } }, { status: error.status });
    return fail(error);
  }
}
