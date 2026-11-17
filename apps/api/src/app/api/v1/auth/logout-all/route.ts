import { currentUser,SESSION_COOKIE } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function POST(){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});await db.session.updateMany({where:{userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});const response=ok({sessionsRevoked:true});response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});return response;}
