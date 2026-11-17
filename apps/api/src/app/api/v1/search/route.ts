import { currentUser } from "@core/lib/auth";
import { fail, ok } from "@core/lib/http";
import { searchWorkspace } from "@core/features/search";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({ q: z.string().trim().min(2).max(100) }).strict();

export async function GET(request:NextRequest){try{const actor=await currentUser();if(!actor)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});const parsed=querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));if(!parsed.success)return fail(parsed.error);return ok(await searchWorkspace(actor,parsed.data.q));}catch(error){return fail(error);}}
