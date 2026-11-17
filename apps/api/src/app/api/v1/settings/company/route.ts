import { z } from "zod";
import { requireRole,AuthError } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail,ok } from "@core/lib/http";
import { NextRequest,NextResponse } from "next/server";
const schema=z.object({displayName:z.string().min(2).max(100),timezone:z.string().min(3).max(100).refine(value=>{try{new Intl.DateTimeFormat("en",{timeZone:value});return true;}catch{return false;}},{message:"Enter a valid IANA timezone."})}).partial();
export async function GET(){try{await requireRole("OWNER");return ok(await db.companySetting.findUnique({where:{id:"company"}}));}catch(error){if(error instanceof AuthError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});return fail(error);}}
export async function PATCH(request:NextRequest){try{const actor=await requireRole("OWNER");const changes=schema.parse(await request.json());const updated=await db.companySetting.update({where:{id:"company"},data:changes});await db.auditLog.create({data:{actorId:actor.id,action:"settings.company_updated",resourceType:"company_setting",resourceId:"company"}});return ok(updated);}catch(error){if(error instanceof AuthError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});return fail(error);}}
