import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";

const bodySchema = z.object({ approve: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.response || !session.response.feedbackSummary) {
    return NextResponse.json({ error: "Analyze responses before approving." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.approve) {
    session.response.approved = true;
    session.stageStatus.response = "completed";
    unlockStage(session, "optimization");
  }

  await saveSession(session);
  return NextResponse.json(session);
}
