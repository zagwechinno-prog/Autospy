import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession } from "@/lib/store";

const bodySchema = z.object({
  entries: z.array(
    z.object({
      prospectLabel: z.string().min(1).max(200),
      date: z.string().max(50),
      channel: z.string().max(100),
      messageSummary: z.string().max(2000),
      responseText: z.string().max(4000),
    })
  ),
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
  if (!session.outreach?.approved) {
    return NextResponse.json({ error: "Approve the Outreach stage first." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  session.response = {
    entries: parsed.data.entries.map((e) => ({ id: randomUUID(), ...e })),
    feedbackSummary: "",
    patterns: [],
    buyerLanguage: [],
    objections: [],
    signalsOfDemand: [],
    signalsOfWeakDemand: [],
    recommendedChanges: [],
    confidence: "",
    generatedAt: new Date().toISOString(),
    approved: false,
  };
  session.stageStatus.response = "in_progress";

  await saveSession(session);
  return NextResponse.json(session);
}
