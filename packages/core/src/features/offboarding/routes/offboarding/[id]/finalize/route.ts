import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail,ok } from "@core/lib/http";
import { visibleEmployeeIds } from "@core/lib/scope";
import { finalizeOffboarding,OffboardingError } from "@core/features/offboarding/service";
import { NextResponse } from "next/server";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){const actor=await currentUser();if(!actor)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});if(!actor.roles.some(r=>["OWNER","HR"].includes(r)))return NextResponse.json({error:{code:"FORBIDDEN",message:"You do not have access to finalize offboarding."}},{status:403});const {id}=await params;try{const visible=await visibleEmployeeIds(actor);if(visible!==null){const record=await db.offboardingCase.findUnique({where:{id},select:{employeeId:true}});if(!record)return NextResponse.json({error:{code:"NOT_FOUND",message:"Offboarding case not found."}},{status:404});if(!visible.includes(record.employeeId))return NextResponse.json({error:{code:"FORBIDDEN",message:"Case is outside your scope."}},{status:403});}return ok(await finalizeOffboarding(id,actor.id));}catch(error){if(error instanceof OffboardingError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status});return fail(error);}}
