import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";
import type { RoleEntry } from "@/lib/types";

const bodySchema = z.object({
  rawNarrative: z.string().max(20000).default(""),
  roles: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        organization: z.string().min(1).max(200),
        period: z.string().max(100).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .default([]),
  achievements: z.array(z.string().min(1).max(500)).default([]),
  notes: z.string().max(5000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (!body.rawNarrative.trim() && body.roles.length === 0) {
    return NextResponse.json(
      { error: "Provide at least a narrative or one role." },
      { status: 400 }
    );
  }

  const roles: RoleEntry[] = body.roles.map((r) => ({ id: randomUUID(), ...r }));

  session.experience = {
    rawNarrative: body.rawNarrative,
    roles,
    achievements: body.achievements,
    notes: body.notes,
    submittedAt: new Date().toISOString(),
  };
  session.stageStatus.experience = "completed";
  unlockStage(session, "profile");

  await saveSession(session);
  return NextResponse.json(session);
}
