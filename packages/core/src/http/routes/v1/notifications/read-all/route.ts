import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function POST(){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});const result=await db.notification.updateMany({where:{recipientUserId:user.id,readAt:null},data:{readAt:new Date()}});return ok({updated:result.count});}
