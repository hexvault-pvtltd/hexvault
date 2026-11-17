import { requireRole,AuthError } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail,ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function GET(){try{await requireRole("OWNER");return ok(await db.role.findMany({include:{permissions:{include:{permission:true}}},orderBy:{name:"asc"}}));}catch(error){if(error instanceof AuthError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});return fail(error);}}
