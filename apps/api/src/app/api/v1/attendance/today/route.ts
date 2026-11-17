import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
import { companyWorkDate } from "@core/lib/time";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});if(!user.employee)return ok(null);const date=companyWorkDate();return ok(await db.attendanceSession.findFirst({where:{employeeId:user.employee.id,workDate:date},include:{breaks:true},orderBy:{checkInAt:"desc"}}));}
