import { z } from "zod";
import { db } from "@core/lib/db";
import { fail, ok } from "@core/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { acceptingApplications } from "@core/features/hiring/public-catalog";

type Context = { params: Promise<{ id: string }> };

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(120).optional(),
  portfolioUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  linkedInUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  coverLetter: z.string().trim().min(20).max(8000),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
}).strict();

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const input = applicationSchema.parse(await request.json());
    const now = new Date();
    const job = await db.jobPosting.findFirst({
      where: { id, ...acceptingApplications(now) },
      select: { id: true },
    });
    if (!job) return NextResponse.json({ error: { code: "NOT_FOUND", message: "This role is no longer accepting applications." } }, { status: 404 });
    const item = await db.jobApplication.create({
      data: {
        jobPostingId: job.id,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        location: input.location || null,
        portfolioUrl: input.portfolioUrl || null,
        linkedInUrl: input.linkedInUrl || null,
        coverLetter: input.coverLetter,
      },
      select: { id: true, createdAt: true },
    });
    return ok({ item, submitted: true }, 201);
  } catch (error) { return fail(error); }
}
