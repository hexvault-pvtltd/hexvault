import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NextRequest } from "next/server";
const schema=z.object({name:z.string().trim().min(2).max(80),annualAllowance:z.number().min(0).max(366).nullable().optional()}).strict();
export async function GET(){const actor=await currentUser();if(!actor)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});const items=await db.leaveType.findMany({where:actor.roles.some(role=>["OWNER","HR"].includes(role))?{}:{active:true},orderBy:{name:"asc"}});return ok(items);}
export async function POST(request:NextRequest){try{const actor=await currentUser();if(!actor)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});if(!actor.roles.some(role=>["OWNER","HR"].includes(role)))return NextResponse.json({error:{code:"FORBIDDEN",message:"Only Owner or HR can manage leave policies."}},{status:403});const input=schema.parse(await request.json());const item=await db.$transaction(async tx=>{const created=await tx.leaveType.create({data:{name:input.name,annualAllowance:input.annualAllowance??null}});await tx.auditLog.create({data:{actorId:actor.id,action:"leave_type.created",resourceType:"leave_type",resourceId:created.id}});return created;});return ok(item,201);}catch(error){return fail(error);}}
