import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { rankOpportunities } from "@/lib/prompts/opportunities";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.profile?.approved || !session.autopsy?.approved || !session.capabilities?.approved || !session.market?.approved) {
    return NextResponse.json(
      { error: "Approve the Profile, Autopsy, Capabilities, and Market stages first." },
      { status: 400 }
    );
  }

  try {
    session.opportunities = await rankOpportunities(session.profile, session.autopsy, session.capabilities, session.market);
    session.stageStatus.opportunities = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to rank opportunities.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
