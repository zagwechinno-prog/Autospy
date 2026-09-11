import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, saveSession, unlockStage } from "@/lib/store";
import { buildSelectedDirection } from "@/lib/prompts/direction";

const bodySchema = z.object({
  opportunityId: z.string(),
  reasonSelected: z.string().min(1).max(2000),
  openQuestions: z.array(z.string().max(500)).default([]),
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
  if (!session.direction || !session.opportunities) {
    return NextResponse.json({ error: "Generate the Direction guidance first." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  if (!session.direction.candidateIds.includes(body.opportunityId)) {
    return NextResponse.json({ error: "That opportunity was not one of the presented candidates." }, { status: 400 });
  }
  const opportunity = session.opportunities.opportunities.find((o) => o.id === body.opportunityId);
  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  session.direction.selected = buildSelectedDirection(opportunity, body.reasonSelected, body.openQuestions);
  session.direction.approved = true;
  session.stageStatus.direction = "completed";
  unlockStage(session, "action_plan");

  await saveSession(session);
  return NextResponse.json(session);
}
