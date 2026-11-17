import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});const {id}=await params;const result=await db.session.updateMany({where:{id,userId:user.id,revokedAt:null},data:{revokedAt:new Date()}});if(!result.count)return NextResponse.json({error:{code:"NOT_FOUND",message:"Session not found."}},{status:404});return ok({revoked:true});}
