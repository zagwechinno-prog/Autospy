import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { architectOffer } from "@/lib/prompts/offer";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.actionPlan?.approved || !session.direction?.selected || !session.profile || !session.market) {
    return NextResponse.json({ error: "Approve the Action Plan stage first." }, { status: 400 });
  }

  try {
    session.offer = await architectOffer(session.direction.selected, session.actionPlan, session.profile, session.market);
    session.stageStatus.offer = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to architect the offer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
