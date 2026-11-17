import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});return ok(await db.session.findMany({where:{userId:user.id},select:{id:true,createdAt:true,expiresAt:true,revokedAt:true,userAgent:true,ip:true},orderBy:{createdAt:"desc"},take:100}));}
