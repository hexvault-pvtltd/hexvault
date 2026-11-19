import { currentUser } from "@core/lib/auth";
import { db } from "@core/lib/db";
import { ok } from "@core/lib/http";
import { NextResponse } from "next/server";
export async function GET(){const user=await currentUser();if(!user)return NextResponse.json({error:{code:"UNAUTHENTICATED",message:"Sign in to continue."}},{status:401});const items=await db.notification.findMany({where:{recipientUserId:user.id},orderBy:{createdAt:"desc"},take:100});return ok({items,unread:items.filter(x=>!x.readAt).length});}
