import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { generateDirectionGuidance } from "@/lib/prompts/direction";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.opportunities?.approved) {
    return NextResponse.json({ error: "Approve the Opportunities stage first." }, { status: 400 });
  }

  const candidates = session.opportunities.opportunities
    .filter((o) => o.reviewStatus !== "rejected")
    .slice(0, 5);

  try {
    const guidance = await generateDirectionGuidance(candidates);
    session.direction = {
      candidateIds: guidance.candidateIds,
      priorityStatements: guidance.priorityStatements,
      generatedAt: guidance.generatedAt,
      approved: false,
    };
    session.stageStatus.direction = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate direction guidance.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
