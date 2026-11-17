import { z } from "zod";
import { hash } from "bcryptjs";
import { hashToken } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
const schema=z.object({token:z.string().min(32).max(200),password:z.string().min(14).max(200)});
export async function POST(request:NextRequest){try{const {token,password}=schema.parse(await request.json());const tokenHash=hashToken(token);const record=await db.passwordResetToken.findUnique({where:{tokenHash}});if(!record||record.usedAt||record.expiresAt<=new Date())return NextResponse.json({error:{code:"INVALID_RESET_TOKEN",message:"This reset link is invalid or has expired."}},{status:400});const passwordHash=await hash(password,12);await db.$transaction(async tx=>{const consumed=await tx.passwordResetToken.updateMany({where:{id:record.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(!consumed.count)throw new Error("RESET_TOKEN_ALREADY_USED");await tx.user.update({where:{id:record.userId},data:{passwordHash}});await tx.session.updateMany({where:{userId:record.userId,revokedAt:null},data:{revokedAt:new Date()}});await tx.auditLog.create({data:{actorId:record.userId,action:"auth.password_reset",resourceType:"user",resourceId:record.userId}});});return ok({passwordUpdated:true});}catch(error){if(error instanceof Error&&error.message==="RESET_TOKEN_ALREADY_USED")return NextResponse.json({error:{code:"INVALID_RESET_TOKEN",message:"This reset link is invalid or has expired."}},{status:400});return fail(error);}}
