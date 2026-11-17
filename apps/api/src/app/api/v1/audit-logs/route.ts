import { z } from "zod";
import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextRequest,NextResponse } from "next/server";
const schema=z.object({resourceType:z.string().max(80).optional(),limit:z.coerce.number().int().min(1).max(100).default(50)});
export async function GET(request:NextRequest){const actor=await currentUser();if(!actor)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});if(!actor.roles.includes("OWNER"))return NextResponse.json({error:{code:"FORBIDDEN",message:"You do not have access to audit logs."}},{status:403});const parsed=schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Invalid filters."}},{status:422});return ok(await db.auditLog.findMany({where:parsed.data.resourceType?{resourceType:parsed.data.resourceType}:undefined,orderBy:{createdAt:"desc"},take:parsed.data.limit}));}
