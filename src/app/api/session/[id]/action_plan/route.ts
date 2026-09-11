import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { buildActionPlan } from "@/lib/prompts/action-plan";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.direction?.approved || !session.direction.selected) {
    return NextResponse.json({ error: "Select a Direction first." }, { status: 400 });
  }

  try {
    session.actionPlan = await buildActionPlan(session.direction.selected);
    session.stageStatus.action_plan = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build the action plan.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
