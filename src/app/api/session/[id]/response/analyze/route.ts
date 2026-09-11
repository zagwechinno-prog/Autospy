import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { analyzeResponses } from "@/lib/prompts/response";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!session.response || session.response.entries.length === 0) {
    return NextResponse.json({ error: "Log at least one response before analyzing." }, { status: 400 });
  }

  try {
    session.response = await analyzeResponses(session.response.entries);
    session.stageStatus.response = "in_progress";
    await saveSession(session);
    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze responses.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
